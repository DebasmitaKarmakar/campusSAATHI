import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CampusOrg, DirectoryContact, User } from '../../types';
import { getWhitelistEntries } from '../../services/authService';
import { DirectoryContactInput, directoryService } from '../../services/directoryService';
import { dbService } from '../../services/dbService';
import { organizations } from './campusOrganizations';
import campusMap from '../../src/assets/images/campus-map.png';

type Section = 'contacts' | 'links' | 'map';
type UsefulLink = { name: string; category: string; description?: string; email?: string; url?: string };
type GroupedUsefulLink = { name: string; category: string; description?: string; emails: string[]; urls: string[] };

const PAGE_LINKS: UsefulLink[] = [
  { name: 'E-Cell NFSU', category: 'Clubs and Societies', description: 'Entrepreneurship cell fostering startup culture, business ideation, and innovation among NFSU students.', email: 'ecell@nfsu.ac.in', url: 'https://e-cell-website-live.vercel.app/events-detail.html?id=2' },
  { name: 'Central Library', category: 'Academic and Student Resources', description: 'University central library providing access to academic journals, digital repositories, and reference services.', email: 'library@nfsu.ac.in', url: 'https://library.nfsu.ac.in' },
  { name: 'NSS Unit', category: 'Clubs and Societies', description: 'National Service Scheme unit coordinating community service, social outreach, and volunteer programmes at NFSU.', email: 'nss@nfsu.ac.in', url: 'https://nss.nfsu.ac.in' },
  { name: 'Coding Club', category: 'Clubs and Societies', description: 'Student-run club for competitive programming, hackathons, open-source contributions, and software development workshops.', email: 'coding@nfsu.ac.in', url: 'https://codingclub-nfsu.vercel.app/' },
  { name: 'Literary Society', category: 'Clubs and Societies', description: 'Campus literary body organising debates, creative writing workshops, poetry events, and publication of the student journal.', email: 'literary@nfsu.ac.in', url: 'https://literary.nfsu.ac.in' },
];

const categoryForType = (type?: string) => {
  switch (type?.toLowerCase()) {
    case 'club':
    case 'cell':
      return 'Clubs and Societies';
    case 'library':
    case 'academic':
      return 'Academic and Student Resources';
    case 'committee':
      return 'Committees and Campus Services';
    default:
      return 'Institutional and Campus Services';
  }
};

const safeWebUrl = (value?: string): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
};

const linkKey = (name: string) =>
  name.trim().toLowerCase().replace(/\s*[—–-]\s*nfsu\s*$/, '').replace(/[^a-z0-9]+/g, ' ').trim();

const normalizedUrl = (value: string) => {
  const url = safeWebUrl(value);
  if (!url) return null;
  return url.replace(/\/(?=\?|#|$)/, '');
};

const EMPTY_FORM: DirectoryContactInput = {
  name: '',
  title: '',
  department: '',
  email: '',
  phone: '',
  ownerEmail: '',
  ownerId: '',
  status: 'draft',
};

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-nfsu-maroon focus:ring-2 focus:ring-nfsu-maroon/10';

export const CampusDirectory: React.FC<{ user: User }> = ({ user }) => {
  const [section, setSection] = useState<Section>('contacts');
  const [contacts, setContacts] = useState<DirectoryContact[]>([]);
  const [form, setForm] = useState<DirectoryContactInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'title'>('name');
  const canAdminManage = user.role === 'admin';
  const ownContact = contacts.find(contact =>
    (contact.ownerId && contact.ownerId === user.id) ||
    (contact.ownerEmail && contact.ownerEmail.toLowerCase() === user.email.toLowerCase())
  );

  const refreshContacts = useCallback(() => {
    try {
      setContacts(directoryService.getContacts(user));
      setError('');
    } catch {
      setError('Unable to load directory contacts from browser storage. Check storage availability and reload.');
    }
  }, [user]);

  useEffect(() => {
    refreshContacts();
    const handleUpdate = (event: Event) => {
      const table = (event as CustomEvent<{ table?: string }>).detail?.table;
      if (table === 'directory_contacts') refreshContacts();
    };
    window.addEventListener('cw_db_update', handleUpdate);
    return () => window.removeEventListener('cw_db_update', handleUpdate);
  }, [refreshContacts]);

  const facultyEntries = useMemo(
    () => getWhitelistEntries().filter(entry => entry.role === 'faculty'),
    [],
  );

  const departments = useMemo(
    () => Array.from(new Set(contacts.map(contact => contact.department).filter((value): value is string => !!value))).sort(),
    [contacts],
  );
  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts
      .filter(contact => departmentFilter === 'all' || contact.department === departmentFilter)
      .filter(contact => statusFilter === 'all' || contact.status === statusFilter)
      .filter(contact => !query || [contact.name, contact.title, contact.department, contact.email, contact.phone]
        .some(value => value?.toLowerCase().includes(query)))
      .sort((a, b) => (a[sortBy] ?? '').localeCompare(b[sortBy] ?? '', undefined, { sensitivity: 'base' }));
  }, [contacts, departmentFilter, search, sortBy, statusFilter]);

  const usefulLinks = useMemo(() => {
    const existingDbLinks = dbService.getTable<CampusOrg>('campus_orgs')
      .filter(org => org.status !== 'inactive')
      .map(org => ({
        name: org.name,
        category: categoryForType(org.type),
        description: org.description,
        email: org.email,
        url: org.website,
      }));
    const legacyLinks = organizations
      .filter(org => org.status !== 'Inactive')
      .map(org => ({
        name: org.name,
        category: categoryForType(org.type),
        description: org.description,
        email: org.email,
        url: org.website,
      }));
    const unique = new Map<string, GroupedUsefulLink>();
    [...PAGE_LINKS, ...existingDbLinks, ...legacyLinks].forEach(link => {
      const key = linkKey(link.name);
      const existing = unique.get(key);
      const merged: GroupedUsefulLink = existing ?? {
        name: link.name,
        category: link.category,
        description: link.description,
        emails: [],
        urls: [],
      };
      if (!merged.description && link.description) merged.description = link.description;
      if (link.email && !merged.emails.some(email => email.toLowerCase() === link.email?.toLowerCase())) {
        merged.emails.push(link.email);
      }
      if (link.url) {
        const destination = normalizedUrl(link.url);
        if (destination && !merged.urls.some(url => normalizedUrl(url) === destination)) merged.urls.push(link.url);
      }
      unique.set(key, merged);
    });
    return Array.from(unique.values()).filter(link => link.urls.length || link.emails.length)
      .reduce<Record<string, GroupedUsefulLink[]>>((groups, link) => {
      (groups[link.category] ??= []).push(link);
        return groups;
      }, {});
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, status: canAdminManage ? 'published' : 'draft' });
    setError('');
    setShowForm(true);
  };

  const startOwnDetails = () => {
    if (ownContact) {
      setEditingId(ownContact.id);
      setForm({
        name: ownContact.name,
        title: ownContact.title ?? '',
        department: ownContact.department ?? '',
        email: ownContact.email ?? '',
        phone: ownContact.phone ?? '',
        ownerEmail: ownContact.ownerEmail,
        ownerId: ownContact.ownerId,
        status: ownContact.status,
      });
    } else {
      setEditingId(null);
      setForm({
        ...EMPTY_FORM,
        name: user.fullName,
        department: user.department,
        email: user.email,
        ownerEmail: user.email,
        ownerId: user.id,
        status: 'draft',
      });
    }
    setError('');
    setShowForm(true);
  };

  const startEdit = (contact: DirectoryContact) => {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      title: contact.title ?? '',
      department: contact.department ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      ownerEmail: contact.ownerEmail,
      ownerId: contact.ownerId,
      status: contact.status,
    });
    setError('');
    setShowForm(true);
  };

  const selectFaculty = (email: string) => {
    const entry = facultyEntries.find(item => item.email === email);
    if (!entry) {
      setForm({ ...EMPTY_FORM, status: 'published' });
      return;
    }
    setForm({
      name: entry.fullName,
      title: '',
      department: entry.department,
      email: entry.email,
      phone: '',
      ownerEmail: entry.email,
      ownerId: String(entry.id),
      status: 'published',
    });
  };

  const submitContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      if (editingId) directoryService.updateContact(user, editingId, form);
      else directoryService.createContact(user, form);
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      refreshContacts();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save this contact.');
    }
  };

  const removeContact = (contact: DirectoryContact) => {
    if (!window.confirm(`Delete ${contact.name}?`)) return;
    try {
      directoryService.deleteContact(user, contact.id);
      refreshContacts();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete this contact.');
    }
  };

  const sections: { id: Section; label: string; description: string }[] = [
    { id: 'contacts', label: 'Important Contacts', description: 'Published campus contacts and support points' },
    { id: 'links', label: 'Useful Links', description: 'Existing campus organisation and service websites' },
    { id: 'map', label: 'Campus Map', description: 'Campus location and navigation' },
  ];

  return (
    <div className="w-full max-w-6xl space-y-7 animate-fadeIn">
      <div className="relative overflow-hidden rounded-[2rem] border-b-8 border-nfsu-maroon bg-nfsu-navy p-7 text-white shadow-2xl md:p-10">
        <div className="absolute inset-0 bg-institutional-pattern opacity-5" />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-nfsu-gold">Campus Services</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight md:text-4xl">Campus Directory</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Find important contacts, official campus links, and map information in one place.
          </p>
        </div>
      </div>

      <nav aria-label="Campus directory sections" className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {sections.map(item => (
          <button key={item.id} type="button" onClick={() => setSection(item.id)}
            aria-current={section === item.id ? 'page' : undefined}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              section === item.id ? 'border-nfsu-maroon bg-white shadow-md' : 'border-slate-100 bg-white/70 hover:border-nfsu-gold'
            }`}>
            <span className="block text-sm font-black uppercase tracking-wide text-nfsu-navy">{item.label}</span>
            <span className="mt-1 block text-xs font-medium text-slate-500">{item.description}</span>
          </button>
        ))}
      </nav>

      {section === 'contacts' && (
        <section className="space-y-4" aria-labelledby="contacts-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 id="contacts-heading" className="text-xl font-black uppercase text-nfsu-navy">Important Contacts</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Students see published entries. Faculty can update only their own details; administrators manage all entries.
              </p>
            </div>
            {user.role === 'faculty' ? (
              <button type="button" onClick={startOwnDetails}
                className="rounded-xl bg-nfsu-maroon px-5 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-nfsu-navy">
                {ownContact ? 'Edit My Details' : 'Add My Details'}
              </button>
            ) : canAdminManage ? (
              <button type="button" onClick={startCreate}
                className="rounded-xl bg-nfsu-maroon px-5 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-nfsu-navy">
                Add Contact
              </button>
            ) : null}
          </div>

          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

          {showForm && (
            <form onSubmit={submitContact} className="grid grid-cols-1 gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg md:grid-cols-2 md:p-7">
              <div className="md:col-span-2">
                <h4 className="font-black text-nfsu-navy">{editingId ? 'Edit contact' : 'New contact'}</h4>
                {user.role === 'faculty' && <p className="mt-1 text-xs font-medium text-slate-500">Your entry remains a draft until an administrator publishes it.</p>}
              </div>
              {canAdminManage && !editingId && (
                <label className="space-y-1 text-xs font-bold text-slate-600 md:col-span-2">
                  Select registered faculty or add staff manually
                  <select className={fieldClass} value={form.ownerEmail ?? ''} onChange={event => selectFaculty(event.target.value)}>
                    <option value="">Manual staff entry</option>
                    {facultyEntries.map(entry => <option key={entry.email} value={entry.email}>{entry.fullName} — {entry.email}</option>)}
                  </select>
                </label>
              )}
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Full name *
                <input className={fieldClass} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Designation
                <input className={fieldClass} value={form.title ?? ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Department or unit
                <input className={fieldClass} value={form.department ?? ''} onChange={e => setForm({ ...form, department: e.target.value })} />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Contact email
                <input className={fieldClass} type="email" value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Contact number
                <input className={fieldClass} type="tel" value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </label>
              {canAdminManage && (
                <label className="space-y-1 text-xs font-bold text-slate-600">
                  Visibility
                  <select className={fieldClass} value={form.status ?? 'published'} onChange={e => setForm({ ...form, status: e.target.value as DirectoryContact['status'] })}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>
              )}
              {error && <p role="alert" className="text-sm font-bold text-red-700 md:col-span-2">{error}</p>}
              <div className="flex gap-3 md:col-span-2">
                <button type="submit" className="rounded-xl bg-nfsu-navy px-5 py-3 text-xs font-black uppercase tracking-widest text-white">Save Contact</button>
                <button type="button" onClick={() => { setShowForm(false); setError(''); }}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600">Cancel</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-4">
            <label className="text-xs font-bold text-slate-600 md:col-span-2">
              Search contacts
              <input className={`${fieldClass} mt-1`} type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, designation, department, email, or phone" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Department
              <select className={`${fieldClass} mt-1`} value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
                <option value="all">All departments</option>
                {departments.map(department => <option key={department} value={department}>{department}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Sort by
              <select className={`${fieldClass} mt-1`} value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
                <option value="name">Name</option>
                <option value="department">Department</option>
                <option value="title">Designation</option>
              </select>
            </label>
            {canAdminManage && (
              <label className="text-xs font-bold text-slate-600 md:col-span-4">
                Visibility filter
                <select className={`${fieldClass} mt-1 md:max-w-xs`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="all">All entries</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
            )}
          </div>

          {filteredContacts.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center text-sm font-medium text-slate-500">No contacts match these filters.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredContacts.map(contact => {
                const own = user.role === 'faculty' && (
                  (contact.ownerId && contact.ownerId === user.id) ||
                  (contact.ownerEmail && contact.ownerEmail.toLowerCase() === user.email.toLowerCase())
                );
                return (
                  <article key={contact.id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-nfsu-navy">{contact.name}</h4>
                          {contact.isSample && <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-amber-800">Fictional sample</span>}
                        </div>
                        {contact.title && <p className="mt-1 text-sm font-semibold text-nfsu-maroon">{contact.title}</p>}
                      </div>
                      {(canAdminManage || own) && <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${contact.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>{contact.status}</span>}
                    </div>
                    {contact.department && <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">{contact.department}</p>}
                    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
                      {contact.email && (contact.isSample
                        ? <span className="text-slate-500">{contact.email} · example only</span>
                        : <a className="text-nfsu-navy hover:text-nfsu-maroon" href={`mailto:${contact.email}`}>{contact.email}</a>)}
                      {contact.phone && (contact.isSample
                        ? <span className="text-slate-500">{contact.phone}</span>
                        : <a className="text-nfsu-navy hover:text-nfsu-maroon" href={`tel:${contact.phone}`}>{contact.phone}</a>)}
                    </div>
                    {(canAdminManage || own) && !contact.isSample && (
                      <div className="mt-5 flex gap-4 border-t border-slate-100 pt-4">
                        <button type="button" onClick={() => startEdit(contact)} className="text-xs font-black uppercase tracking-wider text-nfsu-navy hover:text-nfsu-maroon">{own ? 'Edit My Details' : 'Edit'}</button>
                        {canAdminManage && <button type="button" onClick={() => removeContact(contact)} className="text-xs font-black uppercase tracking-wider text-red-600 hover:text-red-800">Delete</button>}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {section === 'links' && (
        <section className="space-y-6" aria-labelledby="links-heading">
          <div>
            <h3 id="links-heading" className="text-xl font-black uppercase text-nfsu-navy">Useful Links</h3>
            <p className="mt-1 text-xs font-medium text-slate-500">Existing directory and campus-organization destinations are retained.</p>
          </div>
          {(Object.entries(usefulLinks) as [string, GroupedUsefulLink[]][]).map(([category, links]) => (
            <section key={category} aria-label={category} className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-wide text-nfsu-maroon">{category}</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {links.map((link, index) => (
                    <article key={`${link.name}-${index}`} className="flex items-center justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
                      <div className="min-w-0">
                        <h5 className="font-black text-nfsu-navy">{link.name}</h5>
                        {link.description && <p className="mt-2 text-xs leading-relaxed text-slate-500">{link.description}</p>}
                        {link.emails.map(email => <a key={email} href={`mailto:${email}`} className="mt-3 mr-3 inline-block break-all text-xs font-semibold text-nfsu-navy hover:text-nfsu-maroon">{email}</a>)}
                        {link.urls.filter(url => !safeWebUrl(url)).map(url => <p key={url} role="status" className="mt-3 break-all text-xs text-slate-500">Unavailable link: {url}</p>)}
                      </div>
                      {link.urls.filter(url => safeWebUrl(url)).map((url, urlIndex) => (
                        <a key={url} href={safeWebUrl(url)!} target="_blank" rel="noopener noreferrer" title={url}
                          className="shrink-0 rounded-xl bg-nfsu-navy px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-nfsu-maroon">
                          {link.urls.filter(candidate => safeWebUrl(candidate)).length > 1 ? `Visit ${urlIndex + 1}` : 'Visit'}
                        </a>
                      ))}
                    </article>
                ))}
              </div>
            </section>
          ))}
        </section>
      )}

      {section === 'map' && (
        <section aria-labelledby="map-heading">
          <h3 id="map-heading" className="text-xl font-black uppercase text-nfsu-navy">Campus Map</h3>
          <a href={campusMap} target="_blank" rel="noopener noreferrer" className="mt-4 block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md" aria-label="Open campus map image in a larger view">
            <img src={campusMap} alt="Illustrated campus map showing the academic block, water plant, canteen, playground, auditorium, admin block, sports ground, parking, guard room, and main gate" className="h-auto w-full object-contain" />
          </a>
          <p className="mt-2 text-center text-xs font-medium text-slate-500">Select the map to open a larger view.</p>
        </section>
      )}
    </div>
  );
};

export default CampusDirectory;
