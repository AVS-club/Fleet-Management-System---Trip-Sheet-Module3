import React, { useState, useEffect } from 'react';
import { Bell, User, Plus, Loader } from 'lucide-react';
import Button from '../../ui/Button';
import ContactForm from './ContactForm';
import ContactList from './ContactList';
import TemplateTable from './TemplateTable';
import AddTemplateForm from './AddTemplateForm';
import { 
  getReminderContacts, 
  createReminderContact, 
  updateReminderContact, 
  deleteReminderContact,
  getReminderTemplates,
  createReminderTemplate,
  updateReminderTemplate,
  deleteReminderTemplate,
  uploadContactPhoto
} from '../../../utils/reminderService';
import { toast } from 'react-toastify';

const ReminderManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'templates'>('contacts');
  const [contacts, setContacts] = useState<ReminderContact[]>([]);
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<ReminderContact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [contactsData, templatesData] = await Promise.all([
          getReminderContacts(),
          getReminderTemplates()
        ]);
        setContacts(contactsData);
        setTemplates(templatesData);
      } catch (error) {
        console.error('Error fetching reminder data:', error);
        toast.error('Failed to load reminders data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddContact = async (data: ReminderContactFormData) => {
    setIsSubmitting(true);
    try {
      let photoUrl;
      if (data.photo) {
        try {
          // Generate a temporary ID for the photo
          const tempId = `temp-${Date.now()}`;
          photoUrl = await uploadContactPhoto(data.photo, tempId);
        } catch (photoError) {
          if (config.isDev) console.warn('Photo upload failed, proceeding without photo:', photoError);
          toast.warning('Contact created successfully, but photo upload failed. Please ensure the storage bucket exists.');
        }
      }

      const newContact = await createReminderContact({
        full_name: data.full_name,
        position: data.position,
        duty: data.duty,
        phone_number: data.phone_number,
        email: data.email,
        preferred_contact_mode: data.preferred_contact_mode,
        is_active: data.is_active,
        photo_url: photoUrl,
        assigned_types: data.assigned_types,
        is_global: data.is_global // Include is_global field
      });

      // If we uploaded with a temp ID, update the photo with the real ID
      if (data.photo && photoUrl) {
        try {
          const updatedPhotoUrl = await uploadContactPhoto(data.photo, newContact.id);
          if (updatedPhotoUrl) {
            await updateReminderContact(newContact.id, { photo_url: updatedPhotoUrl });
            newContact.photo_url = updatedPhotoUrl;
          }
        } catch (photoError) {
          if (config.isDev) console.warn('Photo update failed, but contact was created:', photoError);
        }
      }

      setContacts([...contacts, newContact]);
      setShowContactForm(false);
      toast.success('Contact added successfully');
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error('Failed to add contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateContact = async (data: ReminderContactFormData) => {
    if (!editingContact) return;
    
    setIsSubmitting(true);
    try {
      let photoUrl = editingContact.photo_url;
      if (data.photo) {
        try {
          const uploadedPhotoUrl = await uploadContactPhoto(data.photo, editingContact.id);
          if (uploadedPhotoUrl) {
            photoUrl = uploadedPhotoUrl;
          }
        } catch (photoError) {
          if (config.isDev) console.warn('Photo upload failed during update:', photoError);
          toast.warning('Contact updated successfully, but photo upload failed. Please ensure the storage bucket exists.');
        }
      }

      const updatedContact = await updateReminderContact(editingContact.id, {
        full_name: data.full_name,
        position: data.position,
        duty: data.duty,
        phone_number: data.phone_number,
        email: data.email,
        preferred_contact_mode: data.preferred_contact_mode,
        is_active: data.is_active,
        photo_url: photoUrl,
        assigned_types: data.assigned_types,
        is_global: data.is_global // Include is_global field
      });

      setContacts(contacts.map(c => c.id === editingContact.id ? updatedContact : c));
      setEditingContact(null);
      toast.success('Contact updated successfully');
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Failed to update contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await deleteReminderContact(id);
      setContacts(contacts.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  };

  const handleAddTemplate = async (template: Omit<ReminderTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newTemplate = await createReminderTemplate(template);
      setTemplates([...templates, newTemplate]);
    } catch (error) {
      console.error('Error adding template:', error);
      throw error;
    }
  };

  const handleUpdateTemplate = async (template: ReminderTemplate) => {
    try {
      const updatedTemplate = await updateReminderTemplate(template.id, template);
      setTemplates(templates.map(t => t.id === template.id ? updatedTemplate : t));
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteReminderTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
            activeTab === 'contacts'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('contacts')}
        >
          <div className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            <span>Reminder Contacts</span>
          </div>
        </button>
        <button
          className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
            activeTab === 'templates'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('templates')}
        >
          <div className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            <span>Reminder Templates</span>
          </div>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader className="h-8 w-8 text-primary-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      ) : (
        <>
          {activeTab === 'contacts' && (
            <div className="space-y-6">
              {showContactForm || editingContact ? (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <ContactForm
                    initialData={editingContact || undefined}
                    onSubmit={editingContact ? handleUpdateContact : handleAddContact}
                    onCancel={() => {
                      setShowContactForm(false);
                      setEditingContact(null);
                    }}
                    isSubmitting={isSubmitting}
                  />
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Reminder Contacts</h2>
                    <p className="text-sm text-gray-500">Manage who receives reminders</p>
                  </div>
                  <Button
                    onClick={() => setShowContactForm(true)}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add Contact
                  </Button>
                </div>
              )}

              {!showContactForm && !editingContact && (
                <ContactList
                  contacts={contacts}
                  onEdit={setEditingContact}
                  onDelete={handleDeleteContact}
                />
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Reminder Templates</h2>
                  <p className="text-sm text-gray-500">Configure when and how reminders are sent</p>
                </div>
              </div>

              <AddTemplateForm
                contacts={contacts}
                onSubmit={handleAddTemplate}
              />

              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Existing Templates
                  </h3>
                </div>
                <TemplateTable
                  templates={templates}
                  contacts={contacts}
                  onSave={handleUpdateTemplate}
                  onDelete={handleDeleteTemplate}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReminderManager;