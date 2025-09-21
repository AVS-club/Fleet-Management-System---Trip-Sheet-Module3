import React, { useState, useEffect, useRef } from 'react';
import { Building2, Upload, Save, Loader2, ArrowLeft, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

interface CompanyData {
  id?: string;
  name: string;
  tagline?: string;
  logo_url?: string;
  contact_email: string;
  contact_phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  pan_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
}

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const CompanySettings: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  
  // File handling
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [existingLogoUrl, setExistingLogoUrl] = useState<string>('');
  const [oldLogoToDelete, setOldLogoToDelete] = useState<string>('');
  
  // Company data
  const [company, setCompany] = useState<CompanyData>({
    name: '',
    contact_email: '',
    contact_phone: '',
  });

  // Validation functions
  const validateGST = (gst: string): boolean => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    return !gst || gstRegex.test(gst);
  };

  const validatePAN = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return !pan || panRegex.test(pan);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[+91]?[6-9][0-9]{9}$/;
    return !phone || phoneRegex.test(phone.replace(/[\s-]/g, ''));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !email || emailRegex.test(email);
  };

  const validatePincode = (pincode: string): boolean => {
    const pincodeRegex = /^[0-9]{6}$/;
    return !pincode || pincodeRegex.test(pincode);
  };

  const validateIFSC = (ifsc: string): boolean => {
    const ifscRegex = /^[A-Z]{4}[0-9]{7}$/;
    return !ifsc || ifscRegex.test(ifsc);
  };

  // Load existing company data
  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (data) {
        setCompany(data);
        setIsEditMode(true);
        if (data.logo_url) {
          setExistingLogoUrl(data.logo_url);
          setPreviewUrl(data.logo_url);
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection (preview only)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setErrors({ ...errors, logo: 'Please select a valid image file (JPG, PNG, GIF, SVG)' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors({ ...errors, logo: 'Image size must be less than 2MB' });
      return;
    }

    // Clear logo errors
    const newErrors = { ...errors };
    delete newErrors.logo;
    setErrors(newErrors);

    // Set for preview
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Mark old logo for deletion if exists
    if (existingLogoUrl) {
      setOldLogoToDelete(existingLogoUrl);
    }
  };

  // Remove selected logo
  const removeLogo = () => {
    setSelectedFile(null);
    setPreviewUrl(existingLogoUrl || '');
    setOldLogoToDelete('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!company.name?.trim()) {
      newErrors.name = 'Company name is required';
    }
    if (company.name && (company.name.length < 3 || company.name.length > 100)) {
      newErrors.name = 'Company name must be between 3 and 100 characters';
    }

    // Email validation
    if (!validateEmail(company.contact_email)) {
      newErrors.email = 'Invalid email format';
    }

    // Phone validation
    if (!validatePhone(company.contact_phone)) {
      newErrors.phone = 'Invalid phone number (10 digits, starting with 6-9)';
    }

    // GST validation
    if (company.gst_number && !validateGST(company.gst_number)) {
      newErrors.gst = 'Invalid GST format (e.g., 22AAAAA0000A1Z5)';
    }

    // PAN validation
    if (company.pan_number && !validatePAN(company.pan_number)) {
      newErrors.pan = 'Invalid PAN format (e.g., ABCDE1234F)';
    }

    // Pincode validation
    if (company.pincode && !validatePincode(company.pincode)) {
      newErrors.pincode = 'Invalid PIN code (6 digits)';
    }

    // IFSC validation
    if (company.ifsc_code && !validateIFSC(company.ifsc_code)) {
      newErrors.ifsc = 'Invalid IFSC code format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Upload logo to storage
  const uploadLogo = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  };

  // Delete old logo from storage
  const deleteOldLogo = async (logoUrl: string, userId: string) => {
    try {
      // Extract file path from URL
      const urlParts = logoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${userId}/${fileName}`;

      await supabase.storage
        .from('company-logos')
        .remove([filePath]);
    } catch (error) {
      console.error('Error deleting old logo:', error);
      // Non-critical error, continue
    }
  };

  // Save company data
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setSuccessMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let finalLogoUrl = existingLogoUrl;

      // Upload new logo if selected
      if (selectedFile) {
        finalLogoUrl = await uploadLogo(selectedFile, user.id) || '';
        
        // Delete old logo after successful upload
        if (oldLogoToDelete) {
          await deleteOldLogo(oldLogoToDelete, user.id);
        }
      }

      // Prepare data
      const companyData = {
        ...company,
        logo_url: finalLogoUrl,
        owner_id: user.id,
        updated_at: new Date().toISOString(),
        logo_updated_at: selectedFile ? new Date().toISOString() : company.logo_url
      };

      // Save to database
      if (isEditMode) {
        const { error } = await supabase
          .from('organizations')
          .update(companyData)
          .eq('owner_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organizations')
          .insert([companyData]);

        if (error) throw error;
        setIsEditMode(true);
      }

      // Update local state
      setExistingLogoUrl(finalLogoUrl || '');
      setSelectedFile(null);
      setOldLogoToDelete('');
      setSuccessMessage('Company information saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error saving company data:', error);
      setErrors({ save: error.message || 'Failed to save company information' });
    } finally {
      setSaving(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof CompanyData, value: string) => {
    setCompany({ ...company, [field]: value });
    
    // Clear field error on change
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Company Profile' : 'Setup Company Profile'}
                </h1>
                <p className="text-sm text-gray-500">
                  Manage your organization's profile and branding
                </p>
              </div>
            </div>
            {isEditMode && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                Profile Active
              </span>
            )}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {errors.save && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{errors.save}</span>
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 space-y-6">
            {/* Company Information Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Company Information</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={company.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter company name"
                    maxLength={100}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={company.tagline || ''}
                    onChange={(e) => handleInputChange('tagline', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Your company slogan"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>

            {/* Logo Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Logo
              </label>
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Company Logo"
                      className="h-24 w-24 object-contain border-2 border-gray-200 rounded-lg"
                    />
                  ) : (
                    <div className="h-24 w-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <div className="flex space-x-2">
                    <label className="cursor-pointer">
                      <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
                        <Upload className="h-4 w-4 mr-2" />
                        {previewUrl && selectedFile ? 'Change Logo' : 'Upload Logo'}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Maximum file size: 2MB. Supported formats: JPG, PNG, GIF, SVG
                  </p>
                  {selectedFile && (
                    <p className="text-xs text-blue-600 mt-1">
                      New logo selected. Will be uploaded when you save.
                    </p>
                  )}
                  {errors.logo && (
                    <p className="text-red-500 text-xs mt-1">{errors.logo}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={company.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="contact@company.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={company.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+91 98765 43210"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Address Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={company.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    rows={2}
                    placeholder="Enter complete address"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={company.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter city"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <select
                      value={company.state || ''}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select State</option>
                      {indianStates.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PIN Code
                    </label>
                    <input
                      type="text"
                      value={company.pincode || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 6) {
                          handleInputChange('pincode', value);
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                        errors.pincode ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="123456"
                      maxLength={6}
                    />
                    {errors.pincode && (
                      <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Tax Information</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={company.gst_number || ''}
                    onChange={(e) => handleInputChange('gst_number', e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                      errors.gst ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                  />
                  {errors.gst && (
                    <p className="text-red-500 text-xs mt-1">{errors.gst}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={company.pan_number || ''}
                    onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                      errors.pan ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                  {errors.pan && (
                    <p className="text-red-500 text-xs mt-1">{errors.pan}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Banking Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Banking Information</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={company.bank_name || ''}
                    onChange={(e) => handleInputChange('bank_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="State Bank of India"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={company.bank_account_number || ''}
                    onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter account number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={company.ifsc_code || ''}
                    onChange={(e) => handleInputChange('ifsc_code', e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                      errors.ifsc ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="SBIN0001234"
                    maxLength={11}
                  />
                  {errors.ifsc && (
                    <p className="text-red-500 text-xs mt-1">{errors.ifsc}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center rounded-b-lg">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? 'Update Company Profile' : 'Create Company Profile'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;