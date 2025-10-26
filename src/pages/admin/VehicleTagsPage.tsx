import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { usePermissions } from '../../hooks/usePermissions';
import { PlusCircle, Tag as TagIcon, ArrowLeft, Loader } from 'lucide-react';
import Button from '../../components/ui/Button';
import TagManagementCard from '../../components/admin/TagManagementCard';
import TagCreateModal from '../../components/admin/TagCreateModal';
import TagVehicleListModal from '../../components/admin/TagVehicleListModal';
import { Tag } from '../../types/tags';
import { getTags, deleteTag } from '../../utils/api/tags';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/LoadingScreen';
import { createLogger } from '../../utils/logger';

const logger = createLogger('VehicleTagsPage');

const VehicleTagsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { permissions, loading: permissionsLoading } = usePermissions();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVehicleListModalOpen, setIsVehicleListModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    setLoading(true);
    try {
      const data = await getTags();
      setTags(data);
    } catch (error) {
      logger.error('Error loading tags:', error);
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (tag: Tag) => {
    if (!window.confirm(`Are you sure you want to delete the tag "${tag.name}"? This will remove it from all vehicles.`)) {
      return;
    }

    try {
      await deleteTag(tag.id);
      toast.success('Tag deleted successfully');
      loadTags();
    } catch (error) {
      logger.error('Error deleting tag:', error);
      toast.error('Failed to delete tag');
    }
  };

  const handleViewVehicles = (tag: Tag) => {
    setSelectedTag(tag);
    setIsVehicleListModalOpen(true);
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setEditingTag(null);
  };

  const handleModalSuccess = () => {
    loadTags();
  };

  if (permissionsLoading || loading) {
    return <LoadingScreen isLoading={true} />;
  }

  if (!permissions?.canAccessAdmin) {
    navigate('/vehicles');
    return null;
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/vehicle-management')}
            className="flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Vehicle Management
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg">
                  <TagIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-display font-medium tracking-tight-plus text-gray-900 dark:text-gray-100">
                    Vehicle Tags Management
                  </h1>
                  <p className="mt-1 text-sm font-sans text-gray-500 dark:text-gray-400">
                    Create and manage tags to categorize vehicles for peer-to-peer performance comparison
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                setEditingTag(null);
                setIsCreateModalOpen(true);
              }}
              className="hidden sm:flex shrink-0"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Create Tag
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Tags</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{tags.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Tagged Vehicles</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {tags.reduce((sum, tag) => sum + (tag.vehicle_count || 0), 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Vehicles/Tag</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {tags.length > 0
                ? Math.round(tags.reduce((sum, tag) => sum + (tag.vehicle_count || 0), 0) / tags.length)
                : 0}
            </p>
          </div>
        </div>

        {/* Tags Grid */}
        {tags.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <TagIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No tags yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating your first vehicle tag
            </p>
            <div className="mt-6">
              <Button
                onClick={() => {
                  setEditingTag(null);
                  setIsCreateModalOpen(true);
                }}
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Create Your First Tag
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map((tag) => (
              <TagManagementCard
                key={tag.id}
                tag={tag}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewVehicles={handleViewVehicles}
              />
            ))}
          </div>
        )}

        {/* Mobile FAB */}
        <button
          onClick={() => {
            setEditingTag(null);
            setIsCreateModalOpen(true);
          }}
          className="sm:hidden fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors z-40"
        >
          <PlusCircle className="h-6 w-6" />
        </button>

        {/* Modals */}
        <TagCreateModal
          isOpen={isCreateModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          editingTag={editingTag}
          existingTags={tags}
        />

        {selectedTag && (
          <TagVehicleListModal
            isOpen={isVehicleListModalOpen}
            onClose={() => {
              setIsVehicleListModalOpen(false);
              setSelectedTag(null);
            }}
            tagId={selectedTag.id}
            tagName={selectedTag.name}
            tagColor={selectedTag.color_hex}
          />
        )}
      </div>
    </Layout>
  );
};

export default VehicleTagsPage;
