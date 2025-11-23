import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  LayoutList,
  Calendar,
  DollarSign,
  MoreVertical,
  X,
  MessageSquare,
  CheckSquare,
  FileText,
  Briefcase,
  GripVertical,
  Paperclip,
  Upload,
  Download,
  Trash2,
} from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, closestCorners, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';
import TaskModal from '../components/TaskModal';

type ProjectStatus = 'DRAFT' | 'IN_PROGRESS' | 'ON_REVIEW' | 'COMPLETED' | 'CANCELED';

interface Project {
  id: string;
  name: string;
  description?: string;
  type?: string;
  budget?: number;
  status: ProjectStatus;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  tasks?: any[];
  invoices?: any[];
  attachments?: Attachment[];
}

interface ActivityEvent {
  id: string;
  type: 'created' | 'status_change' | 'task_completed' | 'message' | 'file_upload' | 'invoice_added';
  message: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
  timestamp: string;
  metadata?: any;
}

interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
  isFromCurrentUser: boolean;
}

interface Attachment {
  id: string;
  filename: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  projectId: string;
}

const statusConfig: Record<ProjectStatus, { label: string; color: string; bgColor: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  ON_REVIEW: { label: 'On Review', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  CANCELED: { label: 'Canceled', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const statusOrder: ProjectStatus[] = ['DRAFT', 'IN_PROGRESS', 'ON_REVIEW', 'COMPLETED', 'CANCELED'];

// Droppable Cards Area for Kanban
function DroppableCardsArea({ status, children }: { status: ProjectStatus; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div ref={setNodeRef} className="space-y-3 min-h-[200px]">
      {children}
    </div>
  );
}

// Status Column wrapper for visual feedback
function StatusColumn({
  status,
  count,
  isActive,
  children
}: {
  status: ProjectStatus;
  count: number;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-gray-50 rounded-lg p-4 transition-all duration-200 ${
        isActive
          ? 'ring-2 ring-purple-500 ring-offset-2 bg-purple-50 shadow-xl scale-[1.02]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${statusConfig[status].bgColor}`} />
          {statusConfig[status].label}
        </h3>
        <span className="text-sm text-gray-500">{count}</span>
      </div>
      {children}
    </div>
  );
}

// Sortable Project Card for Kanban
function SortableProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ProjectCard project={project} onClick={onClick} dragHandleProps={listeners} />
    </div>
  );
}

// Project Card Component
function ProjectCard({
  project,
  onClick,
  dragHandleProps
}: {
  project: Project;
  onClick: () => void;
  dragHandleProps?: any;
}) {
  const taskCount = project.tasks?.length || 0;
  const completedTasks = project.tasks?.filter(t => t.status === 'COMPLETED').length || 0;
  const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-2 flex-1">
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 mt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">{project.name}</h3>
        </div>
        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {project.client && (
        <div className="flex items-center gap-2 mb-3">
          {project.client.avatarUrl ? (
            <img src={project.client.avatarUrl} alt={project.client.name} className="w-6 h-6 rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-xs font-medium text-purple-600">
                {project.client.name.charAt(0)}
              </span>
            </div>
          )}
          <span className="text-sm text-gray-600">{project.client.name}</span>
        </div>
      )}

      {project.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
      )}

      <div className="space-y-2">
        {project.type && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText className="w-4 h-4" />
            <span>{project.type}</span>
          </div>
        )}

        {project.budget && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <DollarSign className="w-4 h-4" />
            <span>${project.budget.toLocaleString()}</span>
          </div>
        )}

        {project.dueDate && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(project.dueDate), 'MMM dd, yyyy')}</span>
          </div>
        )}

        {taskCount > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{completedTasks}/{taskCount} tasks completed</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-purple-600 h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Project Detail Modal
function ProjectDetailModal({ project, onClose, onUpdate }: {
  project: Project;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'invoices' | 'files'>('overview');

  // Task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [localTasks, setLocalTasks] = useState(project.tasks || []);

  // Task handlers
  const handleCreateTask = async (taskData: any) => {
    setTaskLoading(true);
    try {
      const newTask = await api.createTask(project.id, taskData);
      setLocalTasks(prev => [...prev, newTask]);
      toast.success('Task created successfully!');
      setShowTaskModal(false);
      setEditingTask(null);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleUpdateTask = async (taskData: any) => {
    if (!editingTask) return;

    setTaskLoading(true);
    try {
      const updated = await api.updateTask(editingTask.id, taskData);
      setLocalTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t));
      toast.success('Task updated successfully!');
      setShowTaskModal(false);
      setEditingTask(null);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update task');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string, taskName: string) => {
    if (!confirm(`Are you sure you want to delete "${taskName}"?`)) return;

    try {
      await api.deleteTask(taskId);
      setLocalTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task deleted successfully!');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete task');
    }
  };

  const handleToggleTaskStatus = async (task: any) => {
    const newStatus = task.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      const updated = await api.updateTask(task.id, { status: newStatus, progress: newStatus === 'COMPLETED' ? 100 : task.progress });
      setLocalTasks(prev => prev.map(t => t.id === task.id ? updated : t));
      toast.success(`Task marked as ${newStatus === 'COMPLETED' ? 'completed' : 'in progress'}!`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update task');
    }
  };

  // Attachment state
  const [localAttachments, setLocalAttachments] = useState<Attachment[]>(project.attachments || []);
  const [uploading, setUploading] = useState(false);

  // Attachment handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const attachment = await api.uploadAttachment(project.id, file);
      setLocalAttachments(prev => [attachment, ...prev]);
      toast.success('File uploaded successfully!');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleDeleteAttachment = async (id: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
      await api.deleteAttachment(id);
      setLocalAttachments(prev => prev.filter(a => a.id !== id));
      toast.success('Attachment deleted successfully!');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete attachment');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Invoice state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [localInvoices, setLocalInvoices] = useState(project.invoices || []);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Invoice handlers
  const handleCreateInvoice = async (invoiceData: any) => {
    setInvoiceLoading(true);
    try {
      const newInvoice = await api.createInvoice({ ...invoiceData, projectId: project.id });
      setLocalInvoices(prev => [newInvoice, ...prev]);
      toast.success('Invoice created successfully!');
      setShowInvoiceModal(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleUpdateInvoice = async (invoiceData: any) => {
    if (!editingInvoice) return;

    setInvoiceLoading(true);
    try {
      const updated = await api.updateInvoice(editingInvoice.id, invoiceData);
      setLocalInvoices(prev => prev.map(i => i.id === editingInvoice.id ? updated : i));
      toast.success('Invoice updated successfully!');
      setShowInvoiceModal(false);
      setEditingInvoice(null);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      await api.deleteInvoice(invoiceId);
      setLocalInvoices(prev => prev.filter(i => i.id !== invoiceId));
      toast.success('Invoice deleted successfully!');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete invoice');
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'text-red-600 bg-red-100';
    if (priority === 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h2>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[project.status].bgColor} ${statusConfig[project.status].color}`}>
                {statusConfig[project.status].label}
              </span>
              {project.client && (
                <span className="text-sm text-gray-600">Client: {project.client.name}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-8 px-6">
            {[
              { key: 'overview', label: 'Overview', icon: FileText },
              { key: 'tasks', label: 'Tasks', icon: CheckSquare },
              { key: 'invoices', label: 'Invoices', icon: DollarSign },
              { key: 'files', label: 'Files', icon: Paperclip },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === key
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Project Type</h4>
                  <p className="text-gray-900">{project.type || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Budget</h4>
                  <p className="text-gray-900">{project.budget ? `$${project.budget.toLocaleString()}` : 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Due Date</h4>
                  <p className="text-gray-900">
                    {project.dueDate ? format(new Date(project.dueDate), 'MMMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Created</h4>
                  <p className="text-gray-900">{format(new Date(project.createdAt), 'MMMM dd, yyyy')}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Attachments</h3>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                  <Upload className="w-4 h-4" />
                  Upload File
                </button>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setShowTaskModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              </div>

              {localTasks && localTasks.length > 0 ? (
                <div className="space-y-3">
                  {localTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <input
                        type="checkbox"
                        checked={task.status === 'COMPLETED'}
                        onChange={() => handleToggleTaskStatus(task)}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 mt-0.5 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`font-medium ${
                              task.status === 'COMPLETED'
                                ? 'line-through text-gray-500'
                                : 'text-gray-900'
                            }`}
                          >
                            {task.name}
                          </h4>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(task);
                                setShowTaskModal(true);
                              }}
                              className="text-gray-400 hover:text-purple-600"
                              title="Edit task"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id, task.name);
                              }}
                              className="text-gray-400 hover:text-red-600"
                              title="Delete task"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                        )}

                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatusBadge(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>

                          {task.priority && (
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                              Priority {task.priority}
                            </span>
                          )}

                          {task.category && (
                            <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-purple-100 text-purple-700">
                              {task.category}
                            </span>
                          )}

                          {task.dueDate && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                            </span>
                          )}
                        </div>

                        {task.progress > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">Progress</span>
                              <span className="text-xs text-gray-500">{task.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full transition-all"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No tasks yet.</p>
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      setShowTaskModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Task
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
                <button
                  onClick={() => {
                    setEditingInvoice(null);
                    setShowInvoiceModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Create Invoice
                </button>
              </div>

              {localInvoices && localInvoices.length > 0 ? (
                <div className="space-y-3">
                  {localInvoices.map((invoice: any) => (
                    <div key={invoice.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">${invoice.amount.toLocaleString()}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {invoice.dueDate && (
                              <p className="text-sm text-gray-600">
                                Due: {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                              </p>
                            )}
                            {invoice.paidDate && (
                              <p className="text-sm text-green-600">
                                Paid: {format(new Date(invoice.paidDate), 'MMM dd, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                            invoice.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                            invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {invoice.status}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingInvoice(invoice);
                                setShowInvoiceModal(true);
                              }}
                              className="p-1 text-gray-400 hover:text-purple-600 rounded"
                              title="Edit invoice"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="Delete invoice"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">No invoices yet.</p>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Files</h3>
                <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload File'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              {localAttachments.length > 0 ? (
                <div className="space-y-2">
                  {localAttachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Paperclip className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {attachment.filename}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{formatFileSize(attachment.fileSize)}</span>
                            <span>•</span>
                            <span>{format(new Date(attachment.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <a
                          href={api.getAttachmentViewUrl(attachment.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                          title="View"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                        <a
                          href={api.getAttachmentDownloadUrl(attachment.id)}
                          download
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(attachment.id, attachment.filename)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">No files uploaded yet.</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>

    {/* Task Modal */}
    <TaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
        loading={taskLoading}
      />

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4"
          onClick={() => {
            setShowInvoiceModal(false);
            setEditingInvoice(null);
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
              </h3>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setEditingInvoice(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const amount = parseFloat(formData.get('amount') as string);
                const status = formData.get('status') as string;
                const dueDate = formData.get('dueDate') as string;
                const paidDate = formData.get('paidDate') as string;

                const invoiceData = {
                  amount,
                  status: status || 'DRAFT',
                  dueDate: dueDate || undefined,
                  paidDate: paidDate || undefined,
                };

                if (editingInvoice) {
                  handleUpdateInvoice(invoiceData);
                } else {
                  handleCreateInvoice(invoiceData);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={editingInvoice?.amount || ''}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={editingInvoice?.status || 'DRAFT'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={editingInvoice?.dueDate ? new Date(editingInvoice.dueDate).toISOString().split('T')[0] : ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paid Date
                </label>
                <input
                  type="date"
                  name="paidDate"
                  defaultValue={editingInvoice?.paidDate ? new Date(editingInvoice.paidDate).toISOString().split('T')[0] : ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setEditingInvoice(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={invoiceLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invoiceLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {invoiceLoading ? (editingInvoice ? 'Updating...' : 'Creating...') : (editingInvoice ? 'Update Invoice' : 'Create Invoice')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

// Create Project Modal
function CreateProjectModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  console.log('🟣 CreateProjectModal component is rendering!');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    budget: '',
    clientId: '',
    dueDate: '',
  });
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await api.getClients();
      setClients(data as any[]);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.clientId) {
      toast.error('Name and Client are required');
      return;
    }

    setLoading(true);
    try {
      await api.createProject({
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
      });
      toast.success('Project created successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Create New Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client *
            </label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Type
              </label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="e.g., Web Dev, Consulting"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget
              </label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// Main Projects Component
const Projects = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'dueDate' | 'budget'>('name');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  // Handle project ID from URL parameter
  useEffect(() => {
    const projectId = searchParams.get('id');
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        // Clear the URL parameter
        setSearchParams({});
      }
    }
  }, [searchParams, projects, setSearchParams]);

  useEffect(() => {
    console.log('🔵 showCreateModal changed to:', showCreateModal);
  }, [showCreateModal]);

  useEffect(() => {
    filterAndSortProjects();
  }, [projects, searchQuery, statusFilter, sortBy]);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data as Project[]);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProjects = () => {
    let filtered = [...projects];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortBy === 'budget') {
        return (b.budget || 0) - (a.budget || 0);
      }
      return 0;
    });

    setFilteredProjects(filtered);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: any) => {
    const { over } = event;
    if (over) {
      // Check if we're over a droppable column or a card
      if (statusOrder.includes(over.id as ProjectStatus)) {
        setOverId(over.id);
      } else if (over.data?.current?.sortable?.containerId) {
        setOverId(over.data.current.sortable.containerId);
      }
    } else {
      setOverId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    console.log('🟣 Drag end:', {
      activeId: active.id,
      overId: over?.id,
      overContainerId: over?.data?.current?.sortable?.containerId,
    });

    if (!over) {
      console.log('❌ No over - dropped outside');
      return;
    }

    const projectId = active.id as string;
    let newStatus: ProjectStatus | undefined;

    // First check if we dropped on another card (get its container)
    if (over.data?.current?.sortable?.containerId) {
      newStatus = over.data.current.sortable.containerId as ProjectStatus;
      console.log('✅ Got status from card container:', newStatus);
    }
    // Otherwise check if we dropped directly on a droppable column
    else if (statusOrder.includes(over.id as ProjectStatus)) {
      newStatus = over.id as ProjectStatus;
      console.log('✅ Got status from droppable column:', newStatus);
    }

    if (!newStatus) {
      console.error('❌ Could not determine target status');
      return;
    }

    const project = projects.find(p => p.id === projectId);
    if (!project) {
      console.log('❌ Project not found');
      return;
    }

    if (project.status === newStatus) {
      console.log('⚠️ Same status, skipping');
      return;
    }

    console.log('🚀 Updating project:', projectId, 'from', project.status, 'to', newStatus);

    try {
      await api.updateProject(projectId, { status: newStatus });
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, status: newStatus } : p
      ));
      toast.success('Project status updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update project');
    }
  };

  const getProjectsByStatus = (status: ProjectStatus) => {
    return filteredProjects.filter(p => p.status === status);
  };

  const activeProject = activeId ? projects.find(p => p.id === activeId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔴 Button clicked!');
            setShowCreateModal(true);
            console.log('🔴 Modal state set to true');
          }}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </button>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">All Status</option>
              {statusOrder.map(status => (
                <option key={status} value={status}>
                  {statusConfig[status].label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="name">Sort by Name</option>
            <option value="dueDate">Sort by Due Date</option>
            <option value="budget">Sort by Budget</option>
          </select>

          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md ${
                viewMode === 'table'
                  ? 'bg-purple-100 text-purple-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutList className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-md ${
                viewMode === 'kanban'
                  ? 'bg-purple-100 text-purple-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Briefcase className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first project.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </button>
        </div>
      ) : viewMode === 'table' ? (
        // Table View
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <AnimatePresence>
                  {filteredProjects.map((project) => {
                    const taskCount = project.tasks?.length || 0;
                    const completedTasks = project.tasks?.filter(t => t.status === 'COMPLETED').length || 0;
                    const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

                    return (
                      <motion.tr
                        key={project.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedProject(project)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{project.name}</div>
                          {project.description && (
                            <div className="text-sm text-gray-500 line-clamp-1">{project.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {project.client && (
                            <div className="flex items-center gap-2">
                              {project.client.avatarUrl ? (
                                <img src={project.client.avatarUrl} alt={project.client.name} className="w-6 h-6 rounded-full" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                                  <span className="text-xs font-medium text-purple-600">
                                    {project.client.name.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <span className="text-sm text-gray-900">{project.client.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {project.type || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusConfig[project.status].bgColor} ${statusConfig[project.status].color}`}>
                            {statusConfig[project.status].label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {project.dueDate ? format(new Date(project.dueDate), 'MMM dd, yyyy') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {project.budget ? `$${project.budget.toLocaleString()}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {taskCount > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-purple-600 h-2 rounded-full"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{progress}%</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No tasks</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Kanban View
        <DndContext
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statusOrder.map(status => {
              const statusProjects = getProjectsByStatus(status);
              return (
                <StatusColumn
                  key={status}
                  status={status}
                  count={statusProjects.length}
                  isActive={overId === status}
                >
                  <DroppableCardsArea status={status}>
                    <SortableContext
                      items={statusProjects.map(p => p.id)}
                      strategy={verticalListSortingStrategy}
                      id={status}
                    >
                      <AnimatePresence>
                        {statusProjects.map(project => (
                          <SortableProjectCard
                            key={project.id}
                            project={project}
                            onClick={() => setSelectedProject(project)}
                          />
                        ))}
                      </AnimatePresence>
                    </SortableContext>
                  </DroppableCardsArea>
                </StatusColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeProject && <ProjectCard project={activeProject} onClick={() => {}} />}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectDetailModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onUpdate={loadProjects}
          />
        )}

        {showCreateModal && (
          <CreateProjectModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={loadProjects}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Projects;
