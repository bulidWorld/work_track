<template>
  <div class="app">
    <!-- 登录界面 -->
    <div v-if="!currentUser" class="login-container">
      <div class="login-card">
        <div class="login-header">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="login-icon">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="22" y1="21" x2="22" y2="14"></line>
          </svg>
          <h1>Work Track</h1>
          <p>任务管理系统</p>
        </div>
        <form @submit.prevent="login" class="login-form">
          <div class="form-group">
            <label for="username">用户名</label>
            <input
              type="text"
              id="username"
              v-model="loginForm.username"
              required
              placeholder="请输入用户名"
              autocomplete="username"
            >
          </div>
          <div class="form-group">
            <label for="password">密码</label>
            <input
              type="password"
              id="password"
              v-model="loginForm.password"
              required
              placeholder="请输入密码"
              autocomplete="current-password"
            >
          </div>
          <button type="submit" class="btn btn-primary btn-login" :disabled="isLoggingIn">
            <svg v-if="!isLoggingIn" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            <svg v-else class="spinner" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
            {{ isLoggingIn ? '登录中...' : '登录' }}
          </button>
          <div v-if="loginError" class="login-error">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            {{ loginError }}
          </div>
        </form>
        <div class="login-footer">
          <p>支持 OpenLDAP 认证</p>
        </div>
      </div>
    </div>

    <!-- 主界面 -->
    <div v-else class="container">
      <!-- 左侧任务列表 -->
      <div class="task-list">
        <div class="list-header">
          <div class="user-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <div class="user-details">
              <span class="user-name">{{ currentUser.displayName }}</span>
              <span v-if="currentUser.isAdmin" class="admin-badge">管理员</span>
            </div>
          </div>
          <button @click="logout" class="btn btn-logout" aria-label="退出登录">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>

        <div class="list-header">
          <h2>任务列表</h2>
          <div class="list-actions">
            <!-- 用户筛选框 (管理员可见) -->
            <select v-if="currentUser?.isAdmin" v-model="filterUserId" @change="onFilterUserChange" class="user-filter-select">
              <option :value="null">所有用户</option>
              <option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.displayName }} ({{ u.username }})
              </option>
            </select>
            <button @click="showCreateTaskForm = true" class="create-task-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              新建任务
            </button>
          </div>
        </div>
        <div v-if="tasks.length === 0" class="empty-state">
          <p>暂无任务，点击上方按钮创建新任务</p>
        </div>
        <div v-else>
          <div class="tasks">
          <div
            v-for="task in tasks"
            :key="task.id"
            class="task-item"
            :class="{ 'completed': task.status === 'completed', 'selected': selectedTask && selectedTask.id === task.id }"
            @click="showTaskDetail(task)"
          >
            <div class="task-title">
              <div class="task-header">
                <h3>{{ task.title }}</h3>
                <!-- 任务路径显示在右上角 -->
                <div v-if="task.path && task.path.length > 0" class="task-path" :title="formatTaskPath(task.path)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                  <span class="task-path-text">{{ formatTaskPath(task.path) }}</span>
                </div>
              </div>
              <div class="task-status-container">
                <span class="task-status-indicator" :class="task.status">
                  <svg v-if="task.status === 'in_progress'" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  {{ task.status === 'in_progress' ? '进行中' : '已完成' }}
                </span>
                <span class="task-assignee-indicator" v-if="task.assignee">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  {{ task.assignee }}
                </span>
                <span v-if="task.status !== 'completed'" class="task-due-date-indicator" :class="getTimeRemaining(task.dueDate).isOverdue ? 'overdue' : ''">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  {{ getTimeRemaining(task.dueDate).text }}
                </span>
              </div>
              <div class="task-meta">
                <span class="task-created-at">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {{ formatDate(task.createdAt) }}
                </span>
                <span v-if="currentUser.isAdmin && task.user" class="task-owner">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  {{ task.user.displayName }}
                </span>
              </div>
            </div>
            <div class="task-item-actions">
              <button @click.stop="editTask(task)" class="btn btn-edit" aria-label="编辑任务">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button @click.stop="deleteTask(task.id)" class="btn btn-delete" aria-label="删除任务">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
          </div>
          
          <!-- 分页控件 -->
          <div class="pagination" v-if="pagination.totalPages > 1">
            <button 
              @click="changePage(pagination.page - 1)" 
              :disabled="pagination.page <= 1"
              class="btn btn-pagination"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <span class="pagination-info">
              第 {{ pagination.page }} / {{ pagination.totalPages }} 页 (共 {{ pagination.total }} 条)
            </span>
            <button 
              @click="changePage(pagination.page + 1)" 
              :disabled="pagination.page >= pagination.totalPages"
              class="btn btn-pagination"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧任务详情 -->
      <div class="task-detail">
        <div v-if="selectedTask" class="detail-content">
          <div class="task-info">
            <h3>{{ selectedTask.title }}</h3>
            <div class="task-status-container">
              <span class="task-status-indicator" :class="selectedTask.status">
                <svg v-if="selectedTask.status === 'in_progress'" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {{ selectedTask.status === 'in_progress' ? '进行中' : '已完成' }}
              </span>
              <span class="task-assignee-indicator" v-if="selectedTask.assignee">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                {{ selectedTask.assignee }}
              </span>
              <span v-if="selectedTask.status !== 'completed'" class="task-due-date-indicator" :class="getTimeRemaining(selectedTask.dueDate).isOverdue ? 'overdue' : ''">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                {{ getTimeRemaining(selectedTask.dueDate).text }}
              </span>
            </div>
            <div class="task-description" v-html="selectedTask.description"></div>
            <button @click="markAsCompleted(selectedTask.id)" class="btn btn-complete" v-if="selectedTask.status === 'in_progress'">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              标记为已完成
            </button>
          </div>

          <!-- 公共任务提示 -->
          <div v-if="selectedTask?.isPublic" class="public-task-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            公共任务 - 其他用户可以查看和编辑
          </div>

          <!-- 附件区域 -->
          <div class="attachments-section">
            <div class="attachments-header">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                附件 <span v-if="attachments.length" class="attachment-count">{{ attachments.length }}</span>
              </h3>
              <label class="btn btn-upload" v-if="selectedTask.status === 'in_progress'">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                上传附件
                <input type="file" @change="uploadAttachment" style="display: none" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip">
              </label>
            </div>
            <div v-if="isUploading" class="uploading-indicator">
              <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
              上传中...
            </div>
            <div v-else-if="attachments.length === 0" class="empty-attachments">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.3;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              <p>暂无附件</p>
            </div>
            <div v-else class="attachments-list">
              <div v-for="attachment in attachments" :key="attachment.id" class="attachment-item">
                <div class="attachment-icon">
                  <svg v-if="attachment.mimeType.startsWith('image/')" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  <svg v-else-if="attachment.mimeType === 'application/pdf'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                </div>
                <div class="attachment-info">
                  <div class="attachment-name">{{ attachment.originalName }}</div>
                  <div class="attachment-meta">
                    <span>{{ formatFileSize(attachment.size) }}</span>
                    <span>•</span>
                    <span>{{ formatDate(attachment.createdAt) }}</span>
                  </div>
                </div>
                <div class="attachment-actions">
                  <a :href="`${API_BASE_URL}/attachments/${attachment.id}`" :download="attachment.originalName" class="btn btn-download" @click.prevent="downloadAttachment(attachment)" title="下载">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </a>
                  <button @click="deleteAttachment(attachment.id)" class="btn btn-delete-attachment" title="删除" v-if="selectedTask.status === 'in_progress'">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="subtasks">
            <div class="subtasks-header">
              <h3>子任务</h3>
              <button @click="showCreateSubTaskForm = true" class="create-subtask-btn" v-if="selectedTask.status === 'in_progress'">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                添加子任务
              </button>
            </div>
            <div v-if="selectedTask.subTasks && selectedTask.subTasks.length === 0" class="empty-subtasks">
              <p>暂无子任务</p>
            </div>
            <div v-else class="subtask-list">
              <div
                v-for="subtask in selectedTask.subTasks"
                :key="subtask.id"
                class="subtask-item"
              >
                <div class="subtask-content">
                  <input
                    type="checkbox"
                    :checked="subtask.status === 'completed'"
                    @change="updateSubTaskStatus(subtask.id, ($event.target as HTMLInputElement).checked)"
                    :aria-label="`标记 ${subtask.title} 为${subtask.status === 'completed' ? '未完成' : '完成'}`"
                  >
                  <span :class="{ 'completed': subtask.status === 'completed' }">{{ subtask.title }}</span>
                </div>
                <div class="subtask-actions">
                  <button @click="editSubTask(subtask)" class="btn btn-edit-small" aria-label="编辑子任务">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button @click="updateSubTaskStatus(subtask.id, subtask.status !== 'completed')" class="btn btn-complete-small" aria-label="切换子任务状态">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </button>
                  <button @click="makeSubTaskIndependent(subtask.id)" class="btn btn-make-independent-small" aria-label="设为独立任务">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </button>
                  <button @click="deleteSubTask(subtask.id)" class="btn btn-delete-small" aria-label="删除子任务">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 任务进展区域 -->
          <div class="progress-section">
            <div class="progress-header">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                任务进展
                <span v-if="progresses && progresses.length" class="progress-count">{{ progresses.length }}</span>
              </h3>
              <button @click="toggleProgresses" class="btn btn-toggle-progress">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: showProgresses ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            </div>
            
            <div v-if="showProgresses" class="progress-content">
              <!-- 添加进展输入框 (仅当可以编辑时显示) -->
              <div v-if="selectedTask?.canEdit !== false" class="add-progress-form">
                <textarea 
                  v-model="newProgressContent" 
                  placeholder="添加任务进展..." 
                  rows="2"
                  class="progress-input"
                ></textarea>
                <button @click="createProgress" class="btn btn-primary btn-sm" :disabled="!newProgressContent.trim()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  添加
                </button>
              </div>
              
              <!-- 进展列表 -->
              <div v-if="!progresses || progresses.length === 0" class="empty-progress">
                <p>暂无进展记录</p>
              </div>
              <div v-else class="progress-list">
                <div v-for="progress in progresses" :key="progress.id" class="progress-item">
                  <div class="progress-avatar">
                    {{ progress.user?.displayName?.charAt(0) || 'U' }}
                  </div>
                  <div class="progress-body">
                    <div class="progress-meta">
                      <span class="progress-author">{{ progress.user?.displayName || '未知用户' }}</span>
                      <span class="progress-time">{{ formatDate(progress.createdAt) }}</span>
                    </div>
                    <div class="progress-text">{{ progress.content }}</div>
                    <button 
                      v-if="progress.userId === currentUser?.id || currentUser?.isAdmin" 
                      @click="deleteProgress(progress.id)" 
                      class="btn btn-delete-progress"
                      title="删除"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-detail">
          <div class="empty-detail-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px; opacity: 0.5;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <h2>选择任务查看详情</h2>
            <p>从左侧列表中选择一个任务以查看详细信息</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="showError" class="error-toast">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      {{ errorMessage }}
    </div>

    <!-- 创建任务表单 -->
    <div v-if="showCreateTaskForm" class="modal">
      <div class="modal-content">
        <h2>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          创建新任务
        </h2>
        <form @submit.prevent="createTask">
          <div class="form-group">
            <label for="title">任务标题</label>
            <input type="text" id="title" v-model="taskForm.title" required placeholder="请输入任务标题">
          </div>
          <div class="form-group">
            <label for="description">任务描述</label>
            <QuillEditor v-model:content="taskForm.description" contentType="html" />
          </div>
          <div class="form-group">
            <label for="dueDate">计划完成日期</label>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <input type="date" id="dueDate" v-model="taskForm.dueDate">
              <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                <button type="button" class="btn btn-sm" @click="setDueDate('tomorrow')">明天</button>
                <button type="button" class="btn btn-sm" @click="setDueDate('nextWeek')">下周</button>
                <button type="button" class="btn btn-sm" @click="setDueDate('nextMonth')">下月</button>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label for="assignee">协助人</label>
            <input type="text" id="assignee" v-model="taskForm.assignee" placeholder="请输入协助人姓名">
          </div>
          <div v-if="currentUser?.isAdmin" class="form-group">
            <label for="userId">分配给</label>
            <select id="userId" v-model="taskForm.userId">
              <option :value="null">选择用户...</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.displayName }} ({{ user.username }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="taskForm.isPublic">
              <span>设为公共任务（其他用户可以查看、编辑和添加进展）</span>
            </label>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              创建
            </button>
            <button type="button" @click="showCreateTaskForm = false" class="btn btn-cancel">取消</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 编辑任务表单 -->
    <div v-if="showEditTaskForm" class="modal">
      <div class="modal-content">
        <h2>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          编辑任务
        </h2>
        <form @submit.prevent="updateTask">
          <div class="form-group">
            <label for="edit-title">任务标题</label>
            <input type="text" id="edit-title" v-model="editTaskForm.title" required placeholder="请输入任务标题">
          </div>
          <div class="form-group">
            <label for="edit-description">任务描述</label>
            <QuillEditor v-model:content="editTaskForm.description" contentType="html" />
          </div>
          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div class="form-group" style="flex: 1; min-width: 150px;">
              <label for="edit-status">任务状态</label>
              <select id="edit-status" v-model="editTaskForm.status">
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
            <div class="form-group" style="flex: 1; min-width: 150px;">
              <label for="edit-assignee">协助人</label>
              <input type="text" id="edit-assignee" v-model="editTaskForm.assignee" placeholder="请输入协助人姓名">
            </div>
          </div>
          <div class="form-group">
            <label for="edit-dueDate">计划完成日期</label>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <input type="date" id="edit-dueDate" v-model="editTaskForm.dueDate">
              <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                <button type="button" class="btn btn-sm" @click="setEditDueDate('tomorrow')">明天</button>
                <button type="button" class="btn btn-sm" @click="setEditDueDate('nextWeek')">下周</button>
                <button type="button" class="btn btn-sm" @click="setEditDueDate('nextMonth')">下月</button>
              </div>
            </div>
          </div>
          <div v-if="currentUser?.isAdmin" class="form-group">
            <label for="edit-userId">分配给</label>
            <select id="edit-userId" v-model="editTaskForm.userId">
              <option :value="null">选择用户...</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.displayName }} ({{ user.username }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="editTaskForm.isPublic">
              <span>设为公共任务（其他用户可以查看、编辑和添加进展）</span>
            </label>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              保存
            </button>
            <button type="button" @click="showEditTaskForm = false" class="btn btn-cancel">取消</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 创建子任务表单 -->
    <div v-if="showCreateSubTaskForm" class="modal">
      <div class="modal-content">
        <h2>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          添加子任务
        </h2>
        <form @submit.prevent="createSubTask">
          <div class="form-group">
            <label for="subtask-title">子任务标题</label>
            <input type="text" id="subtask-title" v-model="subTaskForm.title" required placeholder="请输入子任务标题">
          </div>
          <div class="form-group">
            <label for="subtask-description">子任务描述</label>
            <QuillEditor v-model:content="subTaskForm.description" contentType="html" />
          </div>
          <div class="form-group">
            <label for="subtask-dueDate">计划完成日期</label>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <input type="date" id="subtask-dueDate" v-model="subTaskForm.dueDate">
              <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                <button type="button" class="btn btn-sm" @click="setSubTaskDueDate('tomorrow')">明天</button>
                <button type="button" class="btn btn-sm" @click="setSubTaskDueDate('nextWeek')">下周</button>
                <button type="button" class="btn btn-sm" @click="setSubTaskDueDate('nextMonth')">下月</button>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label for="subtask-assignee">协助人</label>
            <input type="text" id="subtask-assignee" v-model="subTaskForm.assignee" placeholder="请输入协助人姓名">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              添加
            </button>
            <button type="button" @click="showCreateSubTaskForm = false" class="btn btn-cancel">取消</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 编辑子任务表单 -->
    <div v-if="showEditSubTaskForm" class="modal">
      <div class="modal-content">
        <h2>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          编辑子任务
        </h2>
        <form @submit.prevent="updateSubTask">
          <div class="form-group">
            <label for="edit-subtask-title">子任务标题</label>
            <input type="text" id="edit-subtask-title" v-model="editSubTaskForm.title" required placeholder="请输入子任务标题">
          </div>
          <div class="form-group">
            <label for="edit-subtask-description">子任务描述</label>
            <QuillEditor v-model:content="editSubTaskForm.description" contentType="html" />
          </div>
          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div class="form-group" style="flex: 1; min-width: 150px;">
              <label for="edit-subtask-status">任务状态</label>
              <select id="edit-subtask-status" v-model="editSubTaskForm.status">
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
            <div class="form-group" style="flex: 1; min-width: 150px;">
              <label for="edit-subtask-assignee">协助人</label>
              <input type="text" id="edit-subtask-assignee" v-model="editSubTaskForm.assignee" placeholder="请输入协助人姓名">
            </div>
          </div>
          <div class="form-group">
            <label for="edit-subtask-dueDate">计划完成日期</label>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <input type="date" id="edit-subtask-dueDate" v-model="editSubTaskForm.dueDate">
              <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                <button type="button" class="btn btn-sm" @click="setEditSubTaskDueDate('tomorrow')">明天</button>
                <button type="button" class="btn btn-sm" @click="setEditSubTaskDueDate('nextWeek')">下周</button>
                <button type="button" class="btn btn-sm" @click="setEditSubTaskDueDate('nextMonth')">下月</button>
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              保存
            </button>
            <button type="button" @click="showEditSubTaskForm = false" class="btn btn-cancel">取消</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import './App.css';

interface User {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  isAdmin: boolean;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'in_progress' | 'completed';
  parentId: number | null;
  isIndependent: boolean;
  isPublic: boolean;
  dueDate: string | null;
  assignee: string | null;
  userId: number | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  subTasks?: Task[];
  path?: Array<{ id: number; title: string }>;  // 任务路径
  canEdit?: boolean;
}

interface Progress {
  id: number;
  taskId: number;
  content: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Attachment {
  id: number;
  taskId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  filePath: string;
  uploadedBy: number;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = '/api';

// 认证状态
const currentUser = ref<User | null>(null);
const users = ref<User[]>([]);
const authToken = ref<string | null>(null);

// 登录表单
const loginForm = ref({ username: '', password: '' });
const loginError = ref('');
const isLoggingIn = ref(false);

// 任务状态
const tasks = ref<Task[]>([]);
const selectedTask = ref<Task | null>(null);
const showCreateTaskForm = ref(false);
const showEditTaskForm = ref(false);
const showCreateSubTaskForm = ref(false);
const showEditSubTaskForm = ref(false);
const errorMessage = ref('');
const showError = ref(false);

// 分页状态
const pagination = ref<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 0 });

// 用户筛选状态
const filterUserId = ref<number | null>(null);

// 进展状态
const progresses = ref<Progress[]>([]);
const showProgresses = ref(true);  // 默认展开
const newProgressContent = ref('');

// 任务表单
const taskForm = ref({
  title: '',
  description: '',
  dueDate: null as string | null,
  assignee: null as string | null,
  userId: null as number | null,
  isPublic: false
});

const editTaskForm = ref({
  id: 0,
  title: '',
  description: '',
  status: 'in_progress' as 'in_progress' | 'completed',
  dueDate: null as string | null,
  assignee: null as string | null,
  userId: null as number | null,
  isPublic: false
});

const subTaskForm = ref({
  title: '',
  description: '',
  dueDate: null as string | null,
  assignee: null as string | null
});

// 附件相关状态
const attachments = ref<Attachment[]>([]);
const isUploading = ref(false);

const editSubTaskForm = ref({
  id: 0,
  title: '',
  description: '',
  status: 'in_progress' as 'in_progress' | 'completed',
  dueDate: null as string | null,
  assignee: null as string | null
});

// 认证函数
const checkAuth = () => {
  const token = localStorage.getItem('authToken');
  const userStr = localStorage.getItem('currentUser');
  if (token && userStr) {
    authToken.value = token;
    currentUser.value = JSON.parse(userStr);
  }
};

const fetchUsers = async () => {
  if (!authToken.value || !currentUser.value?.isAdmin) return;
  try {
    const response = await fetch(`${API_BASE_URL}/auth/users`, {
      headers: { Authorization: `Bearer ${authToken.value}` }
    });
    if (response.ok) {
      const data = await response.json();
      users.value = data.users;
    }
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};

const login = async () => {
  isLoggingIn.value = true;
  loginError.value = '';
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm.value)
    });
    const data = await response.json();
    if (data.success && data.token && data.user) {
      authToken.value = data.token;
      currentUser.value = data.user;
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      loginForm.value = { username: '', password: '' };
      await fetchTasks();
      if (data.user.isAdmin) {
        await fetchUsers();
      }
    } else {
      loginError.value = data.error || '登录失败';
    }
  } catch (error) {
    loginError.value = '登录失败，请检查网络连接';
    console.error('Login error:', error);
  } finally {
    isLoggingIn.value = false;
  }
};

const logout = () => {
  authToken.value = null;
  currentUser.value = null;
  users.value = [];
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  tasks.value = [];
  selectedTask.value = null;
};

// 任务相关函数
const showErrorToast = (message: string) => {
  errorMessage.value = message;
  showError.value = true;
  setTimeout(() => {
    showError.value = false;
  }, 5000);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 格式化任务路径：一级父任务->二级->...->当前任务
const formatTaskPath = (path: Array<{ id: number; title: string }>): string => {
  if (!path || path.length === 0) return '';
  return path.map(p => p.title).join(' -> ');
};

const getTimeRemaining = (dueDateString: string | null): { text: string; isOverdue: boolean } => {
  if (!dueDateString) {
    return { text: '无截止日期', isOverdue: false };
  }
  const now = new Date();
  const dueDate = new Date(dueDateString);
  const diffInMs = dueDate.getTime() - now.getTime();
  if (diffInMs < 0) {
    const daysOverdue = Math.ceil(Math.abs(diffInMs) / (1000 * 60 * 60 * 24));
    return { text: `已逾期 ${daysOverdue} 天`, isOverdue: true };
  } else {
    const days = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    return { text: `剩余 ${days} 天`, isOverdue: false };
  }
};

const fetchTasks = async () => {
  if (!authToken.value) return;
  try {
    const params = new URLSearchParams();
    params.append('page', pagination.value.page.toString());
    params.append('limit', pagination.value.limit.toString());
    if (filterUserId.value) {
      params.append('userId', filterUserId.value.toString());
    }
    
    const response = await fetch(`${API_BASE_URL}/tasks?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authToken.value}` }
    });
    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return;
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch tasks');
    }
    const data = await response.json();
    tasks.value = data.tasks;
    pagination.value = data.pagination;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    showErrorToast(error instanceof Error ? error.message : '获取任务列表失败');
  }
};

const createTask = async () => {
  if (!authToken.value) return;
  try {
    const body: Record<string, any> = { ...taskForm.value };
    if (!currentUser.value?.isAdmin) {
      delete body.userId;
    }
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create task');
    }
    const newTask = await response.json();
    tasks.value.unshift(newTask);
    showCreateTaskForm.value = false;
    taskForm.value = { title: '', description: '', dueDate: null, assignee: null, userId: null, isPublic: false };
  } catch (error) {
    console.error('Error creating task:', error);
    showErrorToast(error instanceof Error ? error.message : '创建任务失败');
  }
};

const editTask = (task: Task) => {
  let formattedDueDate: string | null = null;
  if (task.dueDate) {
    const date = new Date(task.dueDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    formattedDueDate = `${year}-${month}-${day}`;
  }
  editTaskForm.value = {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    dueDate: formattedDueDate,
    assignee: task.assignee,
    userId: task.userId || null,
    isPublic: task.isPublic
  };
  showEditTaskForm.value = true;
};

const updateTask = async () => {
  if (!authToken.value) return;
  try {
    const body: Record<string, any> = { ...editTaskForm.value };
    if (!currentUser.value?.isAdmin) {
      delete body.userId;
    }
    const response = await fetch(`${API_BASE_URL}/tasks/${editTaskForm.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update task');
    }
    const updatedTask = await response.json();
    const index = tasks.value.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      tasks.value[index] = updatedTask;
    }
    if (selectedTask.value && selectedTask.value.id === updatedTask.id) {
      selectedTask.value = updatedTask;
    }
    showEditTaskForm.value = false;
  } catch (error) {
    console.error('Error updating task:', error);
    showErrorToast(error instanceof Error ? error.message : '更新任务失败');
  }
};

const deleteTask = async (id: number) => {
  if (!confirm('确定要删除这个任务吗？')) return;
  if (!authToken.value) return;
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken.value}` }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete task');
    }
    tasks.value = tasks.value.filter(t => t.id !== id);
    if (selectedTask.value && selectedTask.value.id === id) {
      selectedTask.value = null;
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    showErrorToast(error instanceof Error ? error.message : '删除任务失败');
  }
};

const showTaskDetail = async (task: Task) => {
  if (!authToken.value) return;
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${task.id}`, {
      headers: { Authorization: `Bearer ${authToken.value}` }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch task details');
    }
    const taskDetail = await response.json();
    selectedTask.value = taskDetail;
    // 加载附件
    await loadAttachments(task.id);
    // 加载进展
    await loadProgresses(task.id);
    showProgresses.value = false;  // 默认折叠进展
  } catch (error) {
    console.error('Error fetching task details:', error);
    showErrorToast(error instanceof Error ? error.message : '获取任务详情失败');
  }
};

const markAsCompleted = async (id: number) => {
  if (!authToken.value) return;
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`
      },
      body: JSON.stringify({ status: 'completed' })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to mark task as completed');
    }
    const updatedTask = await response.json();
    const index = tasks.value.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      tasks.value[index] = updatedTask;
    }
    if (selectedTask.value && selectedTask.value.id === updatedTask.id) {
      selectedTask.value = updatedTask;
    }
  } catch (error) {
    console.error('Error marking task as completed:', error);
    showErrorToast(error instanceof Error ? error.message : '标记任务完成失败');
  }
};

const createSubTask = async () => {
  if (!selectedTask.value || !authToken.value) return;
  try {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`
      },
      body: JSON.stringify({
        title: subTaskForm.value.title,
        description: subTaskForm.value.description,
        status: 'in_progress',
        dueDate: subTaskForm.value.dueDate,
        assignee: subTaskForm.value.assignee,
        parentId: selectedTask.value.id
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create subtask');
    }
    const newSubTask = await response.json();
    if (selectedTask.value && selectedTask.value.subTasks) {
      selectedTask.value.subTasks.push(newSubTask);
    }
    showCreateSubTaskForm.value = false;
    subTaskForm.value = { title: '', description: '', dueDate: null, assignee: null };
  } catch (error) {
    console.error('Error creating subtask:', error);
    showErrorToast(error instanceof Error ? error.message : '创建子任务失败');
  }
};

const editSubTask = (subtask: Task) => {
  let formattedDueDate: string | null = null;
  if (subtask.dueDate) {
    const date = new Date(subtask.dueDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    formattedDueDate = `${year}-${month}-${day}`;
  }
  editSubTaskForm.value = {
    id: subtask.id,
    title: subtask.title,
    description: subtask.description,
    status: subtask.status,
    dueDate: formattedDueDate,
    assignee: subtask.assignee
  };
  showEditSubTaskForm.value = true;
};

const updateSubTask = async () => {
  if (!authToken.value) return;
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${editSubTaskForm.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`
      },
      body: JSON.stringify(editSubTaskForm.value)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update subtask');
    }
    const updatedSubTask = await response.json();
    if (selectedTask.value && selectedTask.value.subTasks) {
      const index = selectedTask.value.subTasks.findIndex(subtask => subtask.id === updatedSubTask.id);
      if (index !== -1) {
        selectedTask.value.subTasks[index] = updatedSubTask;
      }
    }
    showEditSubTaskForm.value = false;
  } catch (error) {
    console.error('Error updating subtask:', error);
    showErrorToast(error instanceof Error ? error.message : '更新子任务失败');
  }
};

const updateSubTaskStatus = async (id: number, completed: boolean) => {
  if (!authToken.value) return;
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`
      },
      body: JSON.stringify({ status: completed ? 'completed' : 'in_progress' })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update subtask status');
    }
    const updatedSubTask = await response.json();
    if (selectedTask.value && selectedTask.value.subTasks) {
      const index = selectedTask.value.subTasks.findIndex((st: Task) => st.id === id);
      if (index !== -1) {
        selectedTask.value.subTasks[index] = updatedSubTask;
      }
    }
  } catch (error) {
    console.error('Error updating subtask status:', error);
    showErrorToast(error instanceof Error ? error.message : '更新子任务状态失败');
  }
};

const deleteSubTask = async (id: number) => {
  if (!authToken.value) return;
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken.value}` }
    });
    if (!response.ok) {
      throw new Error('Failed to delete subtask');
    }
    if (selectedTask.value && selectedTask.value.subTasks) {
      selectedTask.value.subTasks = selectedTask.value.subTasks.filter((st: Task) => st.id !== id);
    }
  } catch (error) {
    console.error('Error deleting subtask:', error);
  }
};

const makeSubTaskIndependent = async (id: number) => {
  if (!authToken.value) return;
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`
      },
      body: JSON.stringify({ isIndependent: true })
    });
    if (!response.ok) {
      throw new Error('Failed to make subtask independent');
    }
    await fetchTasks();
    if (selectedTask.value) {
      await showTaskDetail(selectedTask.value);
    }
    showErrorToast('子任务已成功设为独立任务');
  } catch (error) {
    console.error('Error making subtask independent:', error);
    showErrorToast(error instanceof Error ? error.message : '设为独立任务失败');
  }
};

const setDueDate = (type: 'tomorrow' | 'nextWeek' | 'nextMonth') => {
  const date = new Date();
  if (type === 'tomorrow') date.setDate(date.getDate() + 1);
  else if (type === 'nextWeek') date.setDate(date.getDate() + 7);
  else if (type === 'nextMonth') date.setMonth(date.getMonth() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  taskForm.value.dueDate = `${year}-${month}-${day}`;
};

const setEditDueDate = (type: 'tomorrow' | 'nextWeek' | 'nextMonth') => {
  const date = new Date();
  if (type === 'tomorrow') date.setDate(date.getDate() + 1);
  else if (type === 'nextWeek') date.setDate(date.getDate() + 7);
  else if (type === 'nextMonth') date.setMonth(date.getMonth() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  editTaskForm.value.dueDate = `${year}-${month}-${day}`;
};

const setSubTaskDueDate = (type: 'tomorrow' | 'nextWeek' | 'nextMonth') => {
  const date = new Date();
  if (type === 'tomorrow') date.setDate(date.getDate() + 1);
  else if (type === 'nextWeek') date.setDate(date.getDate() + 7);
  else if (type === 'nextMonth') date.setMonth(date.getMonth() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  subTaskForm.value.dueDate = `${year}-${month}-${day}`;
};

const setEditSubTaskDueDate = (type: 'tomorrow' | 'nextWeek' | 'nextMonth') => {
  const date = new Date();
  if (type === 'tomorrow') date.setDate(date.getDate() + 1);
  else if (type === 'nextWeek') date.setDate(date.getDate() + 7);
  else if (type === 'nextMonth') date.setMonth(date.getMonth() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  editSubTaskForm.value.dueDate = `${year}-${month}-${day}`;
};

// 附件相关函数
const loadAttachments = async (taskId: number) => {
  if (!authToken.value) return;
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/attachments`, {
      headers: { Authorization: `Bearer ${authToken.value}` }
    });
    if (!response.ok) return;
    const data = await response.json();
    attachments.value = data;
  } catch (error) {
    console.error('Error loading attachments:', error);
  }
};

const uploadAttachment = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !selectedTask.value) return;

  isUploading.value = true;
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${selectedTask.value.id}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}` },
      body: formData
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '上传失败');
    }
    await loadAttachments(selectedTask.value.id);
    showErrorToast('附件上传成功');
  } catch (error) {
    console.error('Error uploading attachment:', error);
    showErrorToast(error instanceof Error ? error.message : '上传失败');
  } finally {
    isUploading.value = false;
    input.value = '';
  }
};

const downloadAttachment = async (attachment: Attachment) => {
  if (!authToken.value) return;
  try {
    const response = await fetch(`${API_BASE_URL}/attachments/${attachment.id}`, {
      headers: { Authorization: `Bearer ${authToken.value}` }
    });
    if (!response.ok) throw new Error('下载失败');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.originalName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    showErrorToast('下载失败');
  }
};

const deleteAttachment = async (id: number) => {
  if (!confirm('确定要删除这个附件吗？')) return;
  if (!authToken.value) return;
  try {
    const response = await fetch(`${API_BASE_URL}/attachments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken.value}` }
    });
    if (!response.ok) throw new Error('删除失败');
    await loadAttachments(selectedTask.value!.id);
    showErrorToast('附件已删除');
  } catch (error) {
    console.error('Error deleting attachment:', error);
    showErrorToast('删除失败');
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// 进展相关函数
const loadProgresses = async (taskId: number) => {
  if (!authToken.value) return;
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/progress`, {
      headers: { Authorization: `Bearer ${authToken.value}` }
    });
    if (!response.ok) {
      progresses.value = [];
      return;
    }
    const data = await response.json();
    progresses.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error loading progresses:', error);
    progresses.value = [];
  }
};

const createProgress = async () => {
  if (!selectedTask.value || !authToken.value || !newProgressContent.value.trim()) return;
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${selectedTask.value.id}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken.value}`
      },
      body: JSON.stringify({ content: newProgressContent.value })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '添加进展失败');
    }
    const newProgress = await response.json();
    progresses.value.unshift(newProgress);
    newProgressContent.value = '';
    showErrorToast('进展添加成功');
  } catch (error) {
    console.error('Error creating progress:', error);
    showErrorToast(error instanceof Error ? error.message : '添加进展失败');
  }
};

const deleteProgress = async (id: number) => {
  if (!confirm('确定要删除这条进展吗？')) return;
  if (!authToken.value) return;
  try {
    const response = await fetch(`${API_BASE_URL}/progress/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken.value}` }
    });
    if (!response.ok) throw new Error('删除失败');
    progresses.value = progresses.value.filter(p => p.id !== id);
    showErrorToast('进展已删除');
  } catch (error) {
    console.error('Error deleting progress:', error);
    showErrorToast('删除失败');
  }
};

const toggleProgresses = () => {
  showProgresses.value = !showProgresses.value;
};

const changePage = (newPage: number) => {
  if (newPage < 1 || newPage > pagination.value.totalPages) return;
  pagination.value.page = newPage;
  fetchTasks();
};

const onFilterUserChange = () => {
  pagination.value.page = 1;
  fetchTasks();
};

onMounted(async () => {
  checkAuth();
  if (authToken.value) {
    await fetchTasks();
    if (currentUser.value?.isAdmin) {
      await fetchUsers();
    }
  }
});
</script>
