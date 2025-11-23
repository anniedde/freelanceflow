import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../services/api';
import InvoiceModal from './InvoiceModal';

interface ProjectInvoicesProps {
  projectId: string;
  onUpdate: () => void;
}

export default function ProjectInvoices({ projectId, onUpdate }: ProjectInvoicesProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, [projectId]);

  const loadInvoices = async () => {
    try {
      const data = await api.getProjectInvoices(projectId);
      setInvoices(data as any[]);
    } catch (error) {
      console.error('Failed to load invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      await api.deleteInvoice(invoiceId);
      toast.success('Invoice deleted successfully!');
      await loadInvoices();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete invoice');
    }
  };

  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleInvoiceSuccess = async () => {
    await loadInvoices();
    onUpdate();
    setEditingInvoice(null);
  };

  const handleCloseModal = () => {
    setShowInvoiceModal(false);
    setEditingInvoice(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-700';
      case 'SENT':
        return 'bg-blue-100 text-blue-700';
      case 'OVERDUE':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
        <button
          onClick={() => setShowInvoiceModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600 text-center py-8">Loading invoices...</p>
      ) : invoices.length > 0 ? (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-lg">
                    ${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="mt-1 space-y-1">
                    {invoice.dueDate && (
                      <p className="text-sm text-gray-600">
                        Due: {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                      </p>
                    )}
                    {invoice.paidDate && (
                      <p className="text-sm text-gray-600">
                        Paid: {format(new Date(invoice.paidDate), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                  <button
                    onClick={() => handleEditInvoice(invoice)}
                    className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded"
                    title="Edit invoice"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteInvoice(invoice.id)}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-center py-8">
          No invoices yet. Click "Create Invoice" to add one.
        </p>
      )}

      {showInvoiceModal && (
        <InvoiceModal
          projectId={projectId}
          invoice={editingInvoice}
          onClose={handleCloseModal}
          onSuccess={handleInvoiceSuccess}
        />
      )}
    </div>
  );
}
