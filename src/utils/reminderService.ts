import { supabase } from "./supabaseClient";
import { ReminderContact, ReminderTemplate } from "../types/reminders";

// Reminder Contacts CRUD operations
export const getReminderContacts = async (): Promise<ReminderContact[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("Error fetching user data");
    return [];
  }
  const { data, error } = await supabase
    .from("reminder_contacts")
    .select("*")
    .eq("added_by", user.id)
    .order("full_name");

  if (error) {
    console.error("Error fetching reminder contacts:", error);
    throw error;
  }

  return data || [];
};

const getReminderContact = async (
  id: string
): Promise<ReminderContact | null> => {
  const { data, error } = await supabase
    .from("reminder_contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching reminder contact:", error);
    throw error;
  }

  return data;
};

export const createReminderContact = async (
  contact: Omit<ReminderContact, "id" | "created_at" | "updated_at">
): Promise<ReminderContact> => {
  // Ensure all fields have proper defaults to prevent undefined errors
  const safeContact = {
    ...contact,
    full_name: contact.full_name || "",
    position: contact.position || "",
    phone_number: contact.phone_number || "",
    email: contact.email || null,
    duty: contact.duty || null,
    photo_url: contact.photo_url || null,
    assigned_types: Array.isArray(contact.assigned_types)
      ? contact.assigned_types
      : [],
    is_active: contact.is_active ?? true,
    is_global: contact.is_global ?? false,
  };

  console.log("Safe contact data being inserted:", safeContact);
  const { data, error } = await supabase
    .from("reminder_contacts")
    .insert(safeContact)
    .select()
    .single();

  if (error) {
    console.error("Error creating reminder contact:", error);
    throw error;
  }

  return data;
};

export const updateReminderContact = async (
  id: string,
  updates: Partial<ReminderContact>
): Promise<ReminderContact> => {
  const { data, error } = await supabase
    .from("reminder_contacts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating reminder contact:", error);
    throw error;
  }

  return data;
};

export const deleteReminderContact = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("reminder_contacts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting reminder contact:", error);
    throw error;
  }
};

// Reminder Templates CRUD operations
export const getReminderTemplates = async (): Promise<ReminderTemplate[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("Error fetching user data");
    return [];
  }

  const { data, error } = await supabase
    .from("reminder_templates")
    .select("*")
    .eq("added_by", user.id)
    .order("reminder_type");

  if (error) {
    console.error("Error fetching reminder templates:", error);
    throw error;
  }

  return data || [];
};

const getReminderTemplate = async (
  id: string
): Promise<ReminderTemplate | null> => {
  const { data, error } = await supabase
    .from("reminder_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching reminder template:", error);
    throw error;
  }

  return data;
};

export const createReminderTemplate = async (
  template: Omit<ReminderTemplate, "id" | "created_at" | "updated_at">
): Promise<ReminderTemplate> => {
  const { data, error } = await supabase
    .from("reminder_templates")
    .insert(template)
    .select()
    .single();

  if (error) {
    console.error("Error creating reminder template:", error);
    throw error;
  }

  return data;
};

export const updateReminderTemplate = async (
  id: string,
  updates: Partial<ReminderTemplate>
): Promise<ReminderTemplate> => {
  const { data, error } = await supabase
    .from("reminder_templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating reminder template:", error);
    throw error;
  }

  return data;
};

export const deleteReminderTemplate = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("reminder_templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting reminder template:", error);
    throw error;
  }
};

// File upload for contact photos
export const uploadContactPhoto = async (
  file: File | undefined,
  contactId: string
): Promise<string | undefined> => {
  if (!file || !file.name) {
    console.warn("No photo uploaded — skipping uploadContactPhoto.");
    return undefined;
  }

  const fileExt = file.name.split(".").pop(); // safe now because of check above
  const filePath = `reminder-contacts/${contactId}.${fileExt}`;

  try {
    const { error } = await supabase.storage
      .from("contact-photos")
      .upload(filePath, file, { upsert: true });
    if (error) {
      console.error("Error uploading contact photo:", error.message);
      return undefined;
    }

    return filePath;
  } catch (uploadError) {
    console.error("Failed to upload contact photo:", uploadError);
    throw uploadError;
  }
};
