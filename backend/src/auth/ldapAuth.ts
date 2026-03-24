import ldap from 'ldapjs';
import bcrypt from 'bcryptjs';

const LDAP_URL = 'ldap://192.168.110.5:389';
const LDAP_ADMIN_DN = 'cn=admin,dc=naze';
const LDAP_ADMIN_PASSWORD = 'Naze666666';
const LDAP_BASE_DN = 'dc=naze';

const JWT_SECRET = process.env.JWT_SECRET || 'work-track-jwt-secret-change-in-production';

function getAttributeValue(entry: ldap.SearchEntry, name: string): string | null {
  const attr = entry.attributes.find(a => a.type.toLowerCase() === name.toLowerCase());
  return attr ? (Array.isArray(attr.values) ? attr.values[0] : attr.values) : null;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: number;
    username: string;
    displayName: string;
    email: string | null;
    isAdmin: boolean;
  };
  token?: string;
  error?: string;
}

async function authenticateWithLdap(username: string, password: string): Promise<{ success: boolean; dn?: string; displayName?: string; email?: string }> {
  return new Promise((resolve) => {
    const client = ldap.createClient({ url: LDAP_URL });

    const searchDn = `uid=${username},ou=people,${LDAP_BASE_DN}`;

    client.bind(LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD, (err) => {
      if (err) {
        client.destroy();
        // Try alternative search pattern
        searchLdapUser(client, username, password, resolve);
        return;
      }

      // First try direct bind with user credentials
      client.bind(searchDn, password, (bindErr) => {
        if (bindErr) {
          // Direct bind failed, try searching for user
          searchLdapUser(client, username, password, resolve);
        } else {
          // Direct bind succeeded, get user attributes
          client.search(LDAP_BASE_DN, {
            filter: `(uid=${username})`,
            scope: 'sub'
          }, (searchErr, res) => {
            if (searchErr) {
              client.destroy();
              resolve({ success: true, dn: searchDn });
              return;
            }

            let userAttrs: { displayName?: string; email?: string } = {};
            res.on('searchEntry', (entry) => {
              userAttrs = {
                displayName: getAttributeValue(entry, 'cn') || getAttributeValue(entry, 'displayName') || username,
                email: getAttributeValue(entry, 'mail') || getAttributeValue(entry, 'email') || null
              };
            });

            res.on('end', () => {
              client.destroy();
              resolve({ success: true, dn: searchDn, ...userAttrs });
            });
          });
        }
      });
    });
  });
}

function searchLdapUser(client: ldap.Client, username: string, password: string, resolve: (result: { success: boolean; dn?: string; displayName?: string; email?: string }) => void) {
  client.search(LDAP_BASE_DN, {
    filter: `(|(uid=${username})(cn=${username})(sAMAccountName=${username}))`,
    scope: 'sub'
  }, (searchErr, res) => {
    if (searchErr) {
      client.destroy();
      resolve({ success: false });
      return;
    }

    let found = false;
    let userDn = '';
    let userAttrs: { displayName?: string; email?: string } = {};

    res.on('searchEntry', (entry) => {
      const dn = entry.objectName;
      // Try to bind with found DN
      client.bind(dn, password, (bindErr) => {
        if (!bindErr) {
          found = true;
          userDn = dn;
          userAttrs = {
            displayName: getAttributeValue(entry, 'cn') || getAttributeValue(entry, 'displayName') || getAttributeValue(entry, 'uid') || username,
            email: getAttributeValue(entry, 'mail') || getAttributeValue(entry, 'email') || null
          };
        }
      });
    });

    res.on('end', () => {
      client.destroy();
      if (found) {
        resolve({ success: true, dn: userDn, ...userAttrs });
      } else {
        resolve({ success: false });
      }
    });
  });
}

export async function authenticateUser(username: string, password: string, User: any): Promise<AuthResult> {
  try {
    // Check for admin user first
    if (username === 'admin') {
      const adminUser = await User.findOne({ where: { username: 'admin' } });
      if (adminUser && adminUser.isAdmin) {
        const validPassword = await bcrypt.compare(password, adminUser.passwordHash);
        if (validPassword) {
          const token = require('jsonwebtoken').sign(
            { id: adminUser.id, username: adminUser.username, isAdmin: true },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          return {
            success: true,
            user: {
              id: adminUser.id,
              username: adminUser.username,
              displayName: adminUser.displayName,
              email: adminUser.email,
              isAdmin: adminUser.isAdmin
            },
            token
          };
        }
      }
      return { success: false, error: 'Invalid credentials' };
    }

    // Try LDAP authentication for non-admin users
    const ldapResult = await authenticateWithLdap(username, password);

    if (ldapResult.success) {
      // Find or create user in local database
      let user = await User.findOne({ where: { username } });

      if (!user) {
        // Create new user from LDAP
        user = await User.create({
          username,
          passwordHash: null, // LDAP user, no local password
          displayName: ldapResult.displayName || username,
          email: ldapResult.email || null,
          isAdmin: false,
          ldapDn: ldapResult.dn
        });
      } else {
        // Update LDAP DN if changed
        if (ldapResult.dn && user.ldapDn !== ldapResult.dn) {
          await user.update({ ldapDn: ldapResult.dn });
        }
      }

      const token = require('jsonwebtoken').sign(
        { id: user.id, username: user.username, isAdmin: user.isAdmin },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          isAdmin: user.isAdmin
        },
        token
      };
    }

    return { success: false, error: 'Invalid credentials' };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

export function createJwtMiddleware(User: any) {
  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = require('jsonwebtoken').verify(token, JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin
        };
      }
    } catch (error) {
      // Invalid token, continue without user
    }

    next();
  };
}
