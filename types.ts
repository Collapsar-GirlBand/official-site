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