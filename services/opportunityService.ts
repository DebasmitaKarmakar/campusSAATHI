
import { OpportunityPost, OpportunityStatus, OpportunityMode, User } from '../types';
import { dbService } from './dbService';
import { getWhitelistEntries } from './authService';

const TABLE_NAME = 'opportunities';
const DEADLINE_NOTIF_SENT_KEY = 'cw_deadline_notif_sent';

const getDeadlineNotifSent = (): string[] => {
  return JSON.parse(localStorage.getItem(DEADLINE_NOTIF_SENT_KEY) ?? '[]');
};

const markDeadlineNotifSent = (postId: string) => {
  const sent = getDeadlineNotifSent();
  if (!sent.includes(postId)) {
    sent.push(postId);
    localStorage.setItem(DEADLINE_NOTIF_SENT_KEY, JSON.stringify(sent));
  }
};

export const opportunityService = {
  getPosts: (): OpportunityPost[] => {
    let posts = dbService.getTable<OpportunityPost>(TABLE_NAME);
    
    // Auto-cleanup expired posts
    const now = new Date();
    let changed = false;
    posts = posts.map(post => {
      if (post.status === 'Active' && post.deadline) {
        if (new Date(post.deadline) < now) {
          changed = true;
          return { ...post, status: 'Expired' };
        }
      }
      return post;
    });

    if (changed) dbService.saveTable(TABLE_NAME, posts);

    // Check for 1-day deadline notifications
    const sentNotifs = getDeadlineNotifSent();
    const allUsers = getWhitelistEntries();
    const allEmails = allUsers.map(u => u.email);

    posts.forEach(post => {
      if (post.status !== 'Active' || !post.deadline) return;
      if (sentNotifs.includes(post.id)) return;

      const deadline = new Date(post.deadline);
      const msUntilDeadline = deadline.getTime() - now.getTime();
      const hoursLeft = msUntilDeadline / (1000 * 60 * 60);

      if (hoursLeft > 0 && hoursLeft <= 24) {
        dbService.broadcastNotification(
          allEmails,
          'opportunity_deadline',
          `Deadline Tomorrow: ${post.title}`,
          `The opportunity "${post.title}" closes in less than 24 hours. Submit your application before ${deadline.toLocaleDateString()}.`,
          post.id
        );
        markDeadlineNotifSent(post.id);
      }
    });

    return posts;
  },

  createPost: (user: User, data: { 
    title: string, 
    mode: OpportunityMode, 
    deadline: string, 
    description?: string, 
    documentUrl?: string, 
    externalUrl?: string 
  }) => {
    // Prevent duplicate opportunity (same title + deadline)
    const existing = dbService.getTable<OpportunityPost>(TABLE_NAME);
    const isDuplicate = existing.some(
      p => p.title.trim().toLowerCase() === data.title.trim().toLowerCase() &&
           p.deadline === data.deadline &&
           p.status !== 'Rejected' &&
           p.status !== 'Expired'
    );
    if (isDuplicate) {
      return { error: 'An active opportunity with this title and deadline already exists.' };
    }

    const newPost: OpportunityPost = {
      id: `OP-${Date.now()}`,
      ...data,
      status: user.role === 'admin' ? 'Active' : 'Pending',
      posterId: user.id,
      posterEmail: user.email,
      posterRole: user.role,
      createdAt: Date.now()
    };
    
    dbService.addRow(TABLE_NAME, newPost);

    // Notify all users when opportunity goes live immediately (admin post)
    if (newPost.status === 'Active') {
      const allEmails = getWhitelistEntries().map(u => u.email).filter(e => e !== user.email);
      dbService.broadcastNotification(
        allEmails,
        'opportunity_deadline',
        `New Opportunity: ${newPost.title}`,
        `A new opportunity has been posted: "${newPost.title}". Deadline: ${new Date(newPost.deadline).toLocaleDateString()}.`,
        newPost.id
      );
    }

    return newPost;
  },

  verifyPost: (id: string, approve: boolean) => {
    dbService.updateRow<OpportunityPost>(TABLE_NAME, id, { 
      status: approve ? 'Active' : 'Rejected' 
    });
    if (approve) {
      const post = dbService.getTable<OpportunityPost>(TABLE_NAME).find(p => p.id === id);
      if (post) {
        const allEmails = getWhitelistEntries().map(u => u.email);
        dbService.broadcastNotification(
          allEmails,
          'opportunity_deadline',
          `New Opportunity: ${post.title}`,
          `An opportunity has been verified and is now live: "${post.title}". Deadline: ${new Date(post.deadline).toLocaleDateString()}.`,
          id
        );
      }
    }
  },

  deletePost: (id: string) => dbService.deleteRow(TABLE_NAME, id)
};
