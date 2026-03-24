<template>
  <div class="app">
    <div class="container">
      <!-- 左侧任务列表 -->
      <div class="task-list">
        <div class="list-header">
          <h2>任务列表</h2>
          <button @click="showCreateTaskForm = true" class="create-task-btn">创建新任务</button>
        </div>
        <div v-if="tasks.length === 0" class="empty-state">
          <p>暂无任务，点击上方按钮创建新任务</p>
        </div>
        <div v-else class="tasks">
          <div 
            v-for="task in tasks" 
            :key="task.id" 
            class="task-item"
            :class="{ 'completed': task.status === 'completed', 'selected': selectedTask && selectedTask.id === task.id }"
            @click="showTaskDetail(task)"
          >
            <div class="task-hierarchy">
              {{ taskHierarchyCache[task.id] }}
            </div>
            <div class="task-title">
              <h3>{{ task.title }}</h3>
              <div class="task-status-container">
                <span class="task-status-indicator" :class="task.status">
                  {{ task.status === 'in_progress' ? '进行中' : '已完成' }}
                </span>
                <span class="task-assignee-indicator" v-if="task.assignee">
                  协助人：{{ task.assignee }}
                </span>
                <span v-if="task.status !== 'completed'" class="task-due-date-indicator" :class="getTimeRemaining(task.dueDate).isOverdue ? 'overdue' : ''">
                  {{ getTimeRemaining(task.dueDate).text }}
                </span>
              </div>
              <div class="task-meta">
                <span class="task-created-at">
                  {{ formatDate(task.createdAt) }}
                </span>
              </div>
            </div>
            <div class="task-item-actions">
              <button @click.stop="editTask(task)" class="btn btn-edit">编辑</button>
              <button @click.stop="deleteTask(task.id)" class="btn btn-delete">删除</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧任务详情 -->
      <div class="task-detail">
        <div v-if="selectedTask" class="detail-content">
          <div class="task-info">
            <h3>{{ selectedTask.title }}</h3>
            <div class="task-status-container">
              <div class="task-status-detail" :class="selectedTask.status">
                {{ selectedTask.status === 'in_progress' ? '进行中' : '已完成' }}
              </div>
              <div class="task-assignee-indicator" v-if="selectedTask.assignee">
                协助人：{{ selectedTask.assignee }}
              </div>
              <div v-if="selectedTask.status !== 'completed'" class="task-due-date-indicator" :class="getTimeRemaining(selectedTask.dueDate).isOverdue ? 'overdue' : ''">
              {{ getTimeRemaining(selectedTask.dueDate).text }}
            </div>
            </div>
            <div class="task-description" v-html="selectedTask.description"></div>
            <button @click="markAsCompleted(selectedTask.id)" class="btn btn-complete" v-if="selectedTask.status === 'in_progress'">
              标记为已完成
            </button>
           
          </div>
          
          <div class="subtasks">
            <div class="subtasks-header">
              <h3>子任务</h3>
              <button @click="showCreateSubTaskForm = true" class="create-subtask-btn" v-if="selectedTask.status === 'in_progress'">
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
                  >
                  <span :class="{ 'completed': subtask.status === 'completed' }">{{ subtask.title }}</span>
                </div>
                <div class="subtask-actions">
                  <button @click="editSubTask(subtask)" class="btn btn-edit-small">编辑</button>
                  <button @click="updateSubTaskStatus(subtask.id, subtask.status !== 'completed')" class="btn btn-complete-small">
                    {{ subtask.status === 'completed' ? '标记为未完成' : '标记为已完成' }}
                  </button>
                  <button @click="makeSubTaskIndependent(subtask.id)" class="btn btn-make-independent-small">设为独立任务</button>
                  <button @click="deleteSubTask(subtask.id)" class="btn btn-delete-small">删除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-detail">
          <div class="empty-detail-content">
            <h2>选择任务查看详情</h2>
            <p>从左侧列表中选择一个任务以查看详细信息</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="showError" class="error-toast">
      {{ errorMessage }}
    </div>
    
    <!-- 创建任务表单 -->
    <div v-if="showCreateTaskForm" class="modal">
      <div class="modal-content">
        <h2>创建新任务</h2>
        <form @submit.prevent="createTask">
          <div class="form-group">
            <label for="title">任务标题</label>
            <input type="text" id="title" v-model="taskForm.title" required>
          </div>
          <div class="form-group">
            <label for="description">任务描述</label>
            <QuillEditor v-model:content="taskForm.description" contentType="html" />
          </div>
          <div class="form-group">
            <label for="dueDate">计划完成日期</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="date" id="dueDate" v-model="taskForm.dueDate" style="width: 200px;">
              <div style="display: flex; gap: 5px;">
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
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">创建</button>
            <button type="button" @click="showCreateTaskForm = false" class="btn btn-cancel">取消</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 编辑任务表单 -->
    <div v-if="showEditTaskForm" class="modal">
      <div class="modal-content">
        <h2>编辑任务</h2>
        <form @submit.prevent="updateTask">
          <div class="form-group">
            <label for="edit-title">任务标题</label>
            <input type="text" id="edit-title" v-model="editTaskForm.title" required>
          </div>
          <div class="form-group">
            <label for="edit-description">任务描述</label>
            <QuillEditor v-model:content="editTaskForm.description" contentType="html" />
          </div>
          <div style="display: flex; gap: 20px;">
            <div class="form-group" style="flex: 1;">
              <label for="edit-status">任务状态</label>
              <select id="edit-status" v-model="editTaskForm.status">
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
            <div class="form-group" style="flex: 1;">
              <label for="edit-assignee">协助人</label>
              <input type="text" id="edit-assignee" v-model="editTaskForm.assignee" placeholder="请输入协助人姓名">
            </div>
          </div>
          <div class="form-group">
            <label for="edit-dueDate">计划完成日期</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="date" id="edit-dueDate" v-model="editTaskForm.dueDate" style="width: 200px;">
              <div style="display: flex; gap: 5px;">
                <button type="button" class="btn btn-sm" @click="setEditDueDate('tomorrow')">明天</button>
                <button type="button" class="btn btn-sm" @click="setEditDueDate('nextWeek')">下周</button>
                <button type="button" class="btn btn-sm" @click="setEditDueDate('nextMonth')">下月</button>
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">保存</button>
            <button type="button" @click="showEditTaskForm = false" class="btn btn-cancel">取消</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 创建子任务表单 -->
    <div v-if="showCreateSubTaskForm" class="modal">
      <div class="modal-content">
        <h2>添加子任务</h2>
        <form @submit.prevent="createSubTask">
          <div class="form-group">
            <label for="subtask-title">子任务标题</label>
            <input type="text" id="subtask-title" v-model="subTaskForm.title" required>
          </div>
          <div class="form-group">
            <label for="subtask-description">子任务描述</label>
            <QuillEditor v-model:content="subTaskForm.description" contentType="html" />
          </div>
          <div class="form-group">
            <label for="subtask-dueDate">计划完成日期</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="date" id="subtask-dueDate" v-model="subTaskForm.dueDate" style="width: 200px;">
              <div style="display: flex; gap: 5px;">
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
            <button type="submit" class="btn btn-primary">添加</button>
            <button type="button" @click="showCreateSubTaskForm = false" class="btn btn-cancel">取消</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 编辑子任务表单 -->
    <div v-if="showEditSubTaskForm" class="modal">
      <div class="modal-content">
        <h2>编辑子任务</h2>
        <form @submit.prevent="updateSubTask">
          <div class="form-group">
            <label for="edit-subtask-title">子任务标题</label>
            <input type="text" id="edit-subtask-title" v-model="editSubTaskForm.title" required>
          </div>
          <div class="form-group">
            <label for="edit-subtask-description">子任务描述</label>
            <QuillEditor v-model:content="editSubTaskForm.description" contentType="html" />
          </div>
          <div style="display: flex; gap: 20px;">
            <div class="form-group" style="flex: 1;">
              <label for="edit-subtask-status">任务状态</label>
              <select id="edit-subtask-status" v-model="editSubTaskForm.status">
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
            <div class="form-group" style="flex: 1;">
              <label for="edit-subtask-assignee">协助人</label>
              <input type="text" id="edit-subtask-assignee" v-model="editSubTaskForm.assignee" placeholder="请输入协助人姓名">
            </div>
          </div>
          <div class="form-group">
            <label for="edit-subtask-dueDate">计划完成日期</label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="date" id="edit-subtask-dueDate" v-model="editSubTaskForm.dueDate" style="width: 200px;">
              <div style="display: flex; gap: 5px;">
                <button type="button" class="btn btn-sm" @click="setEditSubTaskDueDate('tomorrow')">明天</button>
                <button type="button" class="btn btn-sm" @click="setEditSubTaskDueDate('nextWeek')">下周</button>
                <button type="button" class="btn btn-sm" @click="setEditSubTaskDueDate('nextMonth')">下月</button>
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">保存</button>
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

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'in_progress' | 'completed';
  parentId: number | null;
  isIndependent: boolean;
  dueDate: string | null;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  subTasks?: Task[];
}

const tasks = ref<Task[]>([]);
const selectedTask = ref<Task | null>(null);
const showCreateTaskForm = ref(false);
const showEditTaskForm = ref(false);
const showCreateSubTaskForm = ref(false);
const errorMessage = ref('');
const showError = ref(false);

const taskForm = ref({
  title: '',
  description: '',
  dueDate: null as string | null,
  assignee: null as string | null
});

const editTaskForm = ref({
  id: 0,
  title: '',
  description: '',
  status: 'in_progress' as 'in_progress' | 'completed',
  dueDate: null as string | null,
  assignee: null as string | null
});

const subTaskForm = ref({
  title: '',
  description: '',
  dueDate: null as string | null,
  assignee: null as string | null
});

const editSubTaskForm = ref({
  id: 0,
  title: '',
  description: '',
  status: 'in_progress' as 'in_progress' | 'completed',
  dueDate: null as string | null,
  assignee: null as string | null
});

const showEditSubTaskForm = ref(false);

// 动态获取 API 基础 URL（使用当前页面的主机地址）
const API_BASE_URL = `http://${window.location.hostname}:10513/api`;

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

// 计算任务距离完成时间
const getTimeRemaining = (dueDateString: string | null): { text: string; isOverdue: boolean } => {
  if (!dueDateString) {
    return { text: '无截止日期', isOverdue: false };
  }
  
  const now = new Date();
  const dueDate = new Date(dueDateString);
  const diffInMs = dueDate.getTime() - now.getTime();
  
  if (diffInMs < 0) {
    // 已逾期
    const daysOverdue = Math.ceil(Math.abs(diffInMs) / (1000 * 60 * 60 * 24));
    return { text: `已逾期 ${daysOverdue} 天`, isOverdue: true };
  } else {
    // 未逾期
    const days = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    return { text: `剩余 ${days} 天`, isOverdue: false };
  }
};

// 获取任务的层级路径
const getTaskHierarchy = async (taskId: number): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch task');
    }
    const task = await response.json();
    
    if (!task.parentId) {
      return '';
    }
    
    // 递归获取父任务信息
    const parentHierarchy = await getTaskHierarchy(task.parentId);
    
    // 获取父任务信息
    const parentResponse = await fetch(`${API_BASE_URL}/tasks/${task.parentId}`);
    if (!parentResponse.ok) {
      throw new Error('Failed to fetch parent task');
    }
    const parentTask = await parentResponse.json();
    
    return parentHierarchy ? `${parentHierarchy} > ${parentTask.title}` : parentTask.title;
  } catch (error) {
    console.error('Error getting task hierarchy:', error);
    return '';
  }
};

// 任务层级路径缓存
const taskHierarchyCache = ref<Record<number, string>>({});

// 初始化任务层级路径
const initTaskHierarchies = async () => {
  try {
    for (const task of tasks.value) {
      if (!taskHierarchyCache.value[task.id]) {
        const hierarchy = await getTaskHierarchy(task.id);
        taskHierarchyCache.value[task.id] = hierarchy;
      }
    }
  } catch (error) {
    console.error('Error initializing task hierarchies:', error);
  }
};

const fetchTasks = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch tasks');
    }
    const data = await response.json();
    tasks.value = data;
    // 初始化任务层级路径
    await initTaskHierarchies();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    showErrorToast(error instanceof Error ? error.message : '获取任务列表失败');
  }
};

const createTask = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskForm.value)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create task');
    }
    const newTask = await response.json();
    tasks.value.push(newTask);
    showCreateTaskForm.value = false;
    taskForm.value = {
      title: '',
      description: '',
      dueDate: null,
      assignee: null
    };
  } catch (error) {
    console.error('Error creating task:', error);
    showErrorToast(error instanceof Error ? error.message : '创建任务失败');
  }
};

const editTask = (task: Task) => {
  // 格式化dueDate为YYYY-MM-DD格式，以适应input type="date"
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
    assignee: task.assignee
  };
  showEditTaskForm.value = true;
};

const updateTask = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${editTaskForm.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editTaskForm.value)
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
  if (!confirm('确定要删除这个任务吗？')) {
    return;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE'
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
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${task.id}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch task details');
    }
    const taskDetail = await response.json();
    selectedTask.value = taskDetail;
  } catch (error) {
    console.error('Error fetching task details:', error);
    showErrorToast(error instanceof Error ? error.message : '获取任务详情失败');
  }
};

const markAsCompleted = async (id: number) => {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
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
  if (!selectedTask.value) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
    subTaskForm.value = { 
      title: '',
      description: '',
      dueDate: null,
      assignee: null
    };
  } catch (error) {
    console.error('Error creating subtask:', error);
    showErrorToast(error instanceof Error ? error.message : '创建子任务失败');
  }
};

const editSubTask = (subtask: Task) => {
  // 格式化dueDate为YYYY-MM-DD格式，以适应input type="date"
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
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${editSubTaskForm.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
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
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
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
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE'
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
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isIndependent: true })
    });
    if (!response.ok) {
      throw new Error('Failed to make subtask independent');
    }
    
    // 刷新任务列表
    await fetchTasks();
    // 刷新当前选中任务的子任务列表
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
  if (type === 'tomorrow') {
    date.setDate(date.getDate() + 1);
  } else if (type === 'nextWeek') {
    date.setDate(date.getDate() + 7);
  } else if (type === 'nextMonth') {
    date.setMonth(date.getMonth() + 1);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  taskForm.value.dueDate = `${year}-${month}-${day}`;
};

const setEditDueDate = (type: 'tomorrow' | 'nextWeek' | 'nextMonth') => {
  const date = new Date();
  if (type === 'tomorrow') {
    date.setDate(date.getDate() + 1);
  } else if (type === 'nextWeek') {
    date.setDate(date.getDate() + 7);
  } else if (type === 'nextMonth') {
    date.setMonth(date.getMonth() + 1);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  editTaskForm.value.dueDate = `${year}-${month}-${day}`;
};

const setSubTaskDueDate = (type: 'tomorrow' | 'nextWeek' | 'nextMonth') => {
  const date = new Date();
  if (type === 'tomorrow') {
    date.setDate(date.getDate() + 1);
  } else if (type === 'nextWeek') {
    date.setDate(date.getDate() + 7);
  } else if (type === 'nextMonth') {
    date.setMonth(date.getMonth() + 1);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  subTaskForm.value.dueDate = `${year}-${month}-${day}`;
};

const setEditSubTaskDueDate = (type: 'tomorrow' | 'nextWeek' | 'nextMonth') => {
  const date = new Date();
  if (type === 'tomorrow') {
    date.setDate(date.getDate() + 1);
  } else if (type === 'nextWeek') {
    date.setDate(date.getDate() + 7);
  } else if (type === 'nextMonth') {
    date.setMonth(date.getMonth() + 1);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  editSubTaskForm.value.dueDate = `${year}-${month}-${day}`;
};

onMounted(() => {
  fetchTasks();
});
</script>

<style lang="css">

  
/* Quill编辑器样式 */
:deep(.form-group .ql-container) {
  height: 300px !important;
  min-height: 300px !important;
  max-height: 300px !important;
  border-radius: 4px;
  border: 1px solid #e0e0e0 !important;
  font-family: inherit;
  overflow-y: auto !important;
  box-sizing: border-box;
  margin: 0;
  position: relative;
}

:deep(.form-group .ql-toolbar) {
  border-radius: 4px 4px 0 0;
  border: 1px solid #e0e0e0 !important;
  border-bottom: none !important;
  font-family: inherit;
}

:deep(.form-group .ql-editor) {
  font-size: 14px;
  line-height: 1.5;
  min-height: 370px;
  max-height: 370px;
  overflow-y: auto;
}

/* 确保Quill编辑器的内部容器也有滚动条 */
:deep(.form-group .ql-container .ql-editor.ql-blank) {
  min-height: 370px;
}

/* 确保滚动条能够正确显示 */
:deep(.form-group .ql-container::-webkit-scrollbar) {
  width: 8px;
}

:deep(.form-group .ql-container::-webkit-scrollbar-track) {
  background: #f1f1f1;
  border-radius: 4px;
}

:deep(.form-group .ql-container::-webkit-scrollbar-thumb) {
  background: #888;
  border-radius: 4px;
}

:deep(.form-group .ql-container::-webkit-scrollbar-thumb:hover) {
  background: #555;
}

:deep(.form-group .ql-editor:focus) {
  outline: none;
}
</style>