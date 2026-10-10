
import { canteenService } from './canteenService';
import { lostFoundService } from './lostFoundService';
import { opportunityService } from './opportunityService';
import { resourceService } from './resourceService';
import { User } from '../types';

export interface ProfileActivitySummary {
  canteen: {
    totalOrders: number;
    lastOrderStatus: string;
    avgRatingGiven: number;
  };
  lostFound: {
    itemsReportedLost: number;
    itemsReportedFound: number;
    itemsRecovered: number;
  };
  opportunities: {
    totalPosted: number;
    approvedPosts: number;
    pendingPosts: number;
  };
  resources: {
    papersUploaded: number;
    helpRequestsCreated: number;
    helpSessionsCompleted: number;
  };
}

export const profileService = {
  getActivitySummary: (userEmail: string): ProfileActivitySummary => {
    const orders = canteenService.getOrders().filter(o => o.studentEmail === userEmail);
    const feedbacks = canteenService.getAllFeedback();
    const userFeedbacks = feedbacks.filter(f => orders.some(o => o.id === f.orderId));
    const avgRating = userFeedbacks.length > 0 
      ? (userFeedbacks.reduce((acc, f) => acc + (f.taste + f.quantity + f.hygiene) / 3, 0) / userFeedbacks.length).toFixed(1)
      : 0;

    const lfItems = lostFoundService.getItems();
    const myLost = lfItems.filter(i => i.reporterEmail === userEmail && i.type === 'LostReport').length;
    const myFound = lfItems.filter(i => i.reporterEmail === userEmail && i.type === 'FoundReport').length;
    const myRecovered = lfItems.filter(i => (i.reporterEmail === userEmail || i.claimantEmail === userEmail) && i.status === 'Collected').length;

    const opps = opportunityService.getPosts().filter(p => p.posterEmail === userEmail);
    
    const papers = resourceService.getPapers().filter(p => p.uploaderEmail === userEmail).length;
    const helpReqs = resourceService.getHelpRequests().filter(r => r.requesterEmail === userEmail);
    const completedHelp = helpReqs.filter(r => r.status === 'Completed').length;

    return {
      canteen: {
        totalOrders: orders.length,
        lastOrderStatus: orders[0]?.status || 'N/A',
        avgRatingGiven: Number(avgRating)
      },
      lostFound: {
        itemsReportedLost: myLost,
        itemsReportedFound: myFound,
        itemsRecovered: myRecovered
      },
      opportunities: {
        totalPosted: opps.length,
        approvedPosts: opps.filter(p => p.status === 'Active').length,
        pendingPosts: opps.filter(p => p.status === 'Pending').length
      },
      resources: {
        papersUploaded: papers,
        helpRequestsCreated: helpReqs.length,
        helpSessionsCompleted: completedHelp
      }
    };
  },

  updateProfile: (userEmail: string, data: { preferredName?: string, profilePhoto?: string, department?: string }) => {
    // Standardized Key: profile_data_email
    const key = `profile_data_${userEmail.toLowerCase()}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    const updated = { ...existing, ...data };
    localStorage.setItem(key, JSON.stringify(updated));

    // Also update current session
    const activeUser = JSON.parse(localStorage.getItem('cw_session') || '{}');
    if (activeUser.email && activeUser.email.toLowerCase() === userEmail.toLowerCase()) {
      localStorage.setItem('cw_session', JSON.stringify({ ...activeUser, ...data }));
    }
  }
};
