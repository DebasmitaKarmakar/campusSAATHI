
import { LFItem, LFCategory, LFPostType, LFComment, LFStatus } from '../types';
import { dbService } from './dbService';

const TABLE_NAME = 'lostfound';

export const lostFoundService = {
  getItems: (): LFItem[] => dbService.getTable<LFItem>(TABLE_NAME),

  createItem: (
    user: { id: string, email: string }, 
    type: LFPostType, 
    data: { category: LFCategory, title: string, description: string, location: string, dateTime: string, itemImage?: string }
  ): LFItem => {
    const items = lostFoundService.getItems();
    const newItem: LFItem = {
      id: `LF-${Date.now()}`,
      type,
      category: data.category,
      title: data.title,
      description: data.description,
      location: data.location,
      dateTime: data.dateTime,
      status: type === 'LostReport' ? 'Lost' : 'Found',
      reporterId: user.id,
      reporterEmail: user.email,
      itemImage: data.itemImage,
      createdAt: Date.now(),
      isSensitive: ['ID Card', 'Wallet', 'Electronics'].includes(data.category),
      comments: []
    };
    
    dbService.saveTable(TABLE_NAME, [newItem, ...items]);
    return newItem;
  },

  updateStatus: (id: string, updates: Partial<LFItem>) => {
    dbService.updateRow(TABLE_NAME, id, updates);
  },

  markAsFound: (id: string, finderEmail: string, data: { foundImage: string, location: string, dateTime: string }) => {
    const items = lostFoundService.getItems();
    const item = items.find(i => i.id === id);
    const updates: Partial<LFItem> = {
      status: 'PendingHandover',
      finderEmail,
      location: data.location,
      dateTime: data.dateTime,
      handoverImage: data.foundImage
    };
    lostFoundService.updateStatus(id, updates);
    lostFoundService.addComment(id, finderEmail, `Item reported as found at ${data.location}.`);
    // Notify original reporter
    if (item) {
      dbService.pushNotification(
        item.reporterEmail,
        'lostfound_action',
        'Update on your lost item',
        `Someone has reported finding your item "${item.title}" at ${data.location}.`,
        id
      );
    }
  },

  claimItem: (id: string, claimantEmail: string, proofText: string) => {
    const items = lostFoundService.getItems();
    const item = items.find(i => i.id === id);
    const updates: Partial<LFItem> = {
      status: 'PendingHandover',
      claimantEmail
    };
    lostFoundService.updateStatus(id, updates);
    lostFoundService.addComment(id, claimantEmail, `Ownership claim submitted: ${proofText}`);
    // Notify the finder / reporter
    if (item) {
      const notifyEmail = item.finderEmail ?? item.reporterEmail;
      dbService.pushNotification(
        notifyEmail,
        'lostfound_action',
        'Claim received for your item',
        `A user has submitted a claim for "${item.title}". Review the comments for details.`,
        id
      );
    }
  },

  uploadHandover: (id: string, userEmail: string, proofImage: string) => {
    lostFoundService.updateStatus(id, { handoverImage: proofImage });
    lostFoundService.addComment(id, userEmail, "Handover verification proof uploaded.");
  },

  addComment: (id: string, userEmail: string, text: string) => {
    const items = lostFoundService.getItems();
    const item = items.find(i => i.id === id);
    if (item) {
      const newComment: LFComment = {
        id: `C-${Date.now()}`,
        userEmail,
        text,
        timestamp: Date.now()
      };
      const updatedComments = [...(item.comments || []), newComment];
      lostFoundService.updateStatus(id, { comments: updatedComments });
    }
  },

  confirmCollection: (id: string, userEmail: string) => {
    lostFoundService.updateStatus(id, { status: 'Collected' });
    lostFoundService.addComment(id, userEmail, "Item collection confirmed. Case closed.");
  }
};
