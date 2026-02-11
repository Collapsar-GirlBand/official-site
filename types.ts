export interface Gig {
  id: number;
  date: string;
  location: string;
  venue: string;
  isUpcoming?: boolean;
  url?: string; // Link to the event detail page or video
}

export interface SocialLink {
  id: string;
  name: string;
  code: string;
  url: string;
}

export interface Evaluation {
  commenterId: string;
  text: string;
}

export interface BandMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  unlockThreshold: number; // Score needed to unlock
  audioTrack: string; // Path to audio file
  audioTrack2?: string; // Optional secondary audio file (for AABB looping)
  color: string; // Theme color for the character
  profileImage: string; // URL for the 1715x1640 character art
  avatarImage: string; // URL for the 180x150 small avatar
  evaluations: Evaluation[];
}

// --- STORY SYSTEM TYPES ---
export interface ScriptLine {
  speakerId: string; // 'self' (player) or member ID (e.g., 'drums')
  text: string;
  expression?: string; // e.g., 'smile', 'angry' - maps to file suffixes if you have multiple images
}

export type StoryScript = ScriptLine[];