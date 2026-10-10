import { DirectoryContact, User } from '../types';
import { dbService } from './dbService';

const TABLE = 'directory_contacts';
const SEED_MARKER = 'cw_directory_contacts_seeded_v2';
const SAMPLE_CONTACTS: DirectoryContact[] = [
  ['DIR-SAMPLE-01', 'Campus Help Desk (Sample)', 'Campus enquiries', 'Campus Services', 'helpdesk@example.invalid', '00000 00001 (sample)'],
  ['DIR-SAMPLE-02', 'Library Support (Sample)', 'Library assistance', 'Library', 'library@example.invalid', '00000 00002 (sample)'],
].map(([id, name, title, department, email, phone]) => ({
  id,
  name,
  title,
  department,
  email,
  phone,
  ownerEmail: '',
  status: 'published',
  isSample: true,
  updatedAt: 0,
}));

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const canManageContact = (user: User, contact: DirectoryContact) =>
  user.role === 'admin' ||
  (user.role === 'faculty' &&
    ((contact.ownerId && contact.ownerId === user.id) ||
      (contact.ownerEmail && normalizeEmail(contact.ownerEmail) === normalizeEmail(user.email))));

const seedSampleContacts = () => {
  if (localStorage.getItem(SEED_MARKER) === 'true') return;
  const contacts = dbService.getTable<DirectoryContact>(TABLE);
  const legacySampleIds = new Set(
    Array.from({ length: 12 }, (_, index) => `DIR-SAMPLE-${String(index + 1).padStart(2, '0')}`),
  );
  const withoutLegacySamples = contacts.filter(contact => !legacySampleIds.has(contact.id));
  const existingIds = new Set(withoutLegacySamples.map(contact => contact.id));
  const missing = SAMPLE_CONTACTS.filter(contact => !existingIds.has(contact.id));
  if (withoutLegacySamples.length !== contacts.length || missing.length) {
    dbService.saveTable(TABLE, [...withoutLegacySamples, ...missing]);
  }
  localStorage.setItem(SEED_MARKER, 'true');
};

export interface DirectoryContactInput {
  name: string;
  title?: string | null;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  ownerEmail?: string;
  ownerId?: string;
  status?: DirectoryContact['status'];
}

const optionalValue = (value?: string | null) => value?.trim() || null;

const normalizeContactInput = (input: DirectoryContactInput) => {
  const name = input.name.trim();
  if (!name) throw new Error('Full name is required.');
  const email = optionalValue(input.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address or leave the email blank.');
  }
  return {
    name,
    title: optionalValue(input.title),
    department: optionalValue(input.department),
    email,
    phone: optionalValue(input.phone),
  };
};

export const directoryService = {
  getContacts(user: User): DirectoryContact[] {
    seedSampleContacts();
    return dbService
      .getTable<DirectoryContact>(TABLE)
      .filter(contact => user.role !== 'student' || contact.status === 'published')
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  getOwnContact(user: User): DirectoryContact | undefined {
    if (user.role !== 'faculty') return undefined;
    return dbService.getTable<DirectoryContact>(TABLE).find(contact =>
      (contact.ownerId && contact.ownerId === user.id) ||
      (contact.ownerEmail && normalizeEmail(contact.ownerEmail) === normalizeEmail(user.email))
    );
  },

  createContact(user: User, input: DirectoryContactInput): DirectoryContact {
    if (user.role !== 'admin' && user.role !== 'faculty') {
      throw new Error('You do not have permission to add contacts.');
    }
    const details = normalizeContactInput(input);
    const contacts = dbService.getTable<DirectoryContact>(TABLE);
    const ownerId = user.role === 'faculty' ? user.id : input.ownerId || '';
    const ownerEmail = user.role === 'faculty' ? normalizeEmail(user.email) : normalizeEmail(input.ownerEmail || '');
    if ((ownerId || ownerEmail) && contacts.some(contact =>
      (ownerId && contact.ownerId === ownerId) ||
      (ownerEmail && normalizeEmail(contact.ownerEmail || '') === ownerEmail)
    )) {
      throw new Error(user.role === 'faculty'
        ? 'Your directory entry already exists. Edit your existing details instead.'
        : 'A directory entry is already assigned to this faculty member.');
    }

    const contact: DirectoryContact = {
      id: `DIR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...details,
      ownerEmail,
      ownerId,
      status: user.role === 'admin' ? input.status ?? 'published' : 'draft',
      updatedAt: Date.now(),
    };
    dbService.addRow(TABLE, contact);
    return contact;
  },

  updateContact(user: User, id: string, input: DirectoryContactInput): void {
    const contact = dbService.getTable<DirectoryContact>(TABLE).find(item => item.id === id);
    if (!contact || !canManageContact(user, contact)) {
      throw new Error('You do not have permission to edit this contact.');
    }
    const details = normalizeContactInput(input);
    dbService.updateRow<DirectoryContact>(TABLE, id, {
      ...details,
      ownerEmail: contact.ownerEmail,
      ownerId: contact.ownerId || (user.role === 'faculty' ? user.id : undefined),
      status: user.role === 'admin' ? input.status ?? contact.status : contact.status,
      updatedAt: Date.now(),
    });
  },

  deleteContact(user: User, id: string): void {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can delete directory contacts.');
    }
    const contact = dbService.getTable<DirectoryContact>(TABLE).find(item => item.id === id);
    if (!contact || !canManageContact(user, contact)) {
      throw new Error('You do not have permission to delete this contact.');
    }
    dbService.deleteRow(TABLE, id);
  },
};
