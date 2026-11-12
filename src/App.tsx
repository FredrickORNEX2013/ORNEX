import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Bell,
  Camera,
  Compass,
  Film,
  Heart,
  Home,
  Inbox,
  MessageCircle,
  Plus,
  Search,
  Share2,
  Star,
  Upload,
  User,
} from 'lucide-react';

type TabKey = 'foryou' | 'explore' | 'post' | 'inbox' | 'me';

type DemoVideo = {
  id: number;
  title: string;
  username: string;
  caption: string;
  likes: number;
  comments: number;
  image: string;
};

const demoVideos: DemoVideo[] = [
  {
    id: 1,
    title: 'Golden Hour Drive',
    username: 'amandasix',
    caption: 'Chasing the sun and the weekend energy.',
    likes: 24800,
    comments: 712,
    image: 'https://picsum.photos/seed/ornex-1/900/1600',
  },
  {
    id: 2,
    title: 'City Lights',
    username: 'nightpulse',
    caption: 'Late-night blocks and neon reflections.',
    likes: 18320,
    comments: 506,
    image: 'https://picsum.photos/seed/ornex-2/900/1600',
  },
  {
    id: 3,
    title: 'Coffee Run',
    username: 'brewlogic',
    caption: 'Tiny rituals. Big energy. Fresh espresso.',
    likes: 32650,
    comments: 889,
    image: 'https://picsum.photos/seed/ornex-3/900/1600',
  },
  {
    id: 4,
    title: 'Studio Session',
    username: 'mira.lane',
    caption: 'Soft vocals, warm lights, happy mistakes.',
    likes: 45700,
    comments: 1230,
    image: 'https://picsum.photos/seed/ornex-4/900/1600',
  },
  {
    id: 5,
    title: 'Forest Walk',
    username: 'hollowecho',
    caption: 'Quiet trails and the kind of calm you keep.',
    likes: 27110,
    comments: 642,
    image: 'https://picsum.photos/seed/ornex-5/900/1600',
  },
  {
    id: 6,
    title: 'Weekend Reset',
    username: 'olivestudio',
    caption: 'Resetting the pace and making room for joy.',
    likes: 39020,
    comments: 907,
    image: 'https://picsum.photos/seed/ornex-6/900/1600',
  },
];

const navTabs = [
  { key: 'foryou', label: 'For You', icon: Home },
  { key: 'explore', label: 'Explore', icon: Compass },
  { key: 'post', label: 'Post', icon: Plus },
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'me', label: 'Me', icon: User },
] as const;

const categories = ['All', 'Comedy', 'Drama', 'Entertainment', 'Live'] as const;
const inboxTabs = ['Friends', 'Activities', 'Following', 'Followers', 'Requests'] as const;

function formatCompact(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('foryou');
  const [splashVisible, setSplashVisible] = useState(true);
  const [category, setCategory] = useState<(typeof categories)[number]>('All');
  const [inboxFilter, setInboxFilter] = useState<(typeof inboxTabs)[number]>('Friends');

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashVisible(false), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="app-shell">
      <div className={`ornex-splash${splashVisible ? '' : ' hidden'}`} aria-live="polite">
        <div className="ornex-splash-inner">
          <div className="ornex-splash-ring" />
          <div className="ornex-splash-wordmark">ORNEX</div>
          <div className="ornex-splash-loader">
            <span />
          </div>
        </div>
      </div>

      <div className="app-body" style={{ display: splashVisible ? 'none' : 'block' }}>
        <Screen hidden={activeTab !== 'foryou'}>
          <HomeScreen onOpenPost={() => setActiveTab('post')} />
        </Screen>

        <Screen hidden={activeTab !== 'explore'}>
          <ExploreScreen
            category={category}
            onSetCategory={setCategory}
            videos={demoVideos}
          />
        </Screen>

        <Screen hidden={activeTab !== 'post'}>
          <PostScreen />
        </Screen>

        <Screen hidden={activeTab !== 'inbox'}>
          <InboxScreen activeTab={inboxFilter} onSetTab={setInboxFilter} />
        </Screen>

        <Screen hidden={activeTab !== 'me'}>
          <MeScreen />
        </Screen>

        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>
    </div>
  );
}

function Screen({ children, hidden }: { children: ReactNode; hidden: boolean }) {
  return <div style={{ display: hidden ? 'none' : 'block' }}>{children}</div>;
}

function HomeScreen({ onOpenPost }: { onOpenPost: () => void }) {
  return (
    <div className="screen-root home-screen">
      <header className="top-header">
        <div className="brand-wrap">
          <div className="brand-mark">O</div>
          <span>ORNEX</span>
        </div>

        <div className="header-actions">
          <button className="header-icon" aria-label="Search">
            <Search size={18} />
          </button>
          <button className="header-icon" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <button className="create-button" onClick={onOpenPost}>Create</button>
        </div>
      </header>

      <div className="feed-tabs">
        <button className="feed-tab active">For You</button>
        <button className="feed-tab">Following</button>
      </div>

      <div className="feed-list">
        {demoVideos.map((video) => (
          <article key={video.id} className="video-card">
            <div className="video-media" style={{ backgroundImage: `url(${video.image})` }}>
              <div className="video-gradient" />
              <div className="video-overlay-top">
                <div className="avatar">{video.username.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="video-user">@{video.username}</div>
                  <div className="video-title">{video.title}</div>
                </div>
              </div>
            </div>

            <div className="video-meta-row">
              <div className="video-info">
                <div className="profile-line">
                  <div className="profile-blob">{video.username.slice(0, 1).toUpperCase()}</div>
                  <span>@{video.username}</span>
                </div>
                <p>{video.caption}</p>
              </div>

              <div className="action-stack">
                <button className="action-button">
                  <Heart size={20} />
                  <span>{formatCompact(video.likes)}</span>
                </button>
                <button className="action-button">
                  <MessageCircle size={20} />
                  <span>{formatCompact(video.comments)}</span>
                </button>
                <button className="action-button">
                  <Share2 size={20} />
                  <span>Share</span>
                </button>
                <button className="action-button reward-button">
                  <Star size={20} />
                  <span>Earn</span>
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ExploreScreen({
  videos,
  category,
  onSetCategory,
}: {
  videos: DemoVideo[];
  category: (typeof categories)[number];
  onSetCategory: (value: (typeof categories)[number]) => void;
}) {
  return (
    <div className="screen-root explore-screen">
      <header className="section-header">
        <h1>Explore</h1>
      </header>

      <div className="discover-text">Discover stories</div>

      <div className="search-wrap">
        <Search size={16} />
        <input type="text" placeholder="Search videos or creators" />
      </div>

      <div className="category-row">
        {categories.map((item) => (
          <button
            key={item}
            className={`category-pill ${category === item ? 'active' : ''}`}
            onClick={() => onSetCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="explore-grid">
        {videos.map((video) => (
          <div key={video.id} className="explore-card" style={{ backgroundImage: `url(${video.image})` }}>
            <div className="explore-card-overlay">
              <div className="explore-card-top">
                <span>@{video.username}</span>
                <span>{video.likes > 10000 ? 'Hot' : 'New'}</span>
              </div>
              <div className="explore-card-title">{video.title}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PostScreen() {
  return (
    <div className="screen-root post-screen">
      <header className="section-header">
        <h1>Create</h1>
      </header>

      <div className="upload-grid">
        <button className="upload-card">
          <span className="upload-icon red"><Upload size={28} /></span>
          <div>
            <strong>Upload</strong>
            <small>Choose a video from your device</small>
          </div>
        </button>

        <button className="upload-card">
          <span className="upload-icon red"><Camera size={28} /></span>
          <div>
            <strong>Record</strong>
            <small>Capture a fresh clip right away</small>
          </div>
        </button>

        <button className="upload-card">
          <span className="upload-icon red"><Film size={28} /></span>
          <div>
            <strong>Gallery</strong>
            <small>Pick from saved media</small>
          </div>
        </button>
      </div>
    </div>
  );
}

function InboxScreen({
  activeTab,
  onSetTab,
}: {
  activeTab: (typeof inboxTabs)[number];
  onSetTab: (value: (typeof inboxTabs)[number]) => void;
}) {
  return (
    <div className="screen-root inbox-screen">
      <header className="section-header inbox-header">
        <h1>Inbox</h1>
      </header>

      <div className="inbox-tabs">
        {inboxTabs.map((tab) => (
          <button
            key={tab}
            className={`inbox-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onSetTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="inbox-content">
        {activeTab === 'Friends' && <ListCard title="Friends" body="You are connected with 24 creators." />}
        {activeTab === 'Activities' && <ListCard title="Activities" body="New comments and shares show up here." />}
        {activeTab === 'Following' && <ListCard title="Following" body="Your following list is up to date." />}
        {activeTab === 'Followers' && <ListCard title="Followers" body="1,248 people are following you." />}
        {activeTab === 'Requests' && <ListCard title="Requests" body="You have 3 pending follow requests." />}
      </div>
    </div>
  );
}

function ListCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="list-card">
      <div className="list-pill">{title}</div>
      <p>{body}</p>
    </div>
  );
}

function MeScreen() {
  return (
    <div className="screen-root me-screen">
      <div className="profile-card">
        <div className="profile-avatar">OU</div>
        <h2>ORNEX User</h2>
        <p>@ornex_user</p>
        <button className="edit-button">EDIT USERNAME</button>
      </div>

      <div className="stats-row">
        <div>
          <strong>128</strong>
          <span>Videos</span>
        </div>
        <div>
          <strong>24</strong>
          <span>Hours</span>
        </div>
        <div>
          <strong>1.8M</strong>
          <span>Followers</span>
        </div>
      </div>

      <div className="rewards-box">
        <div className="rewards-head">
          <span>Rewards</span>
          <span>24/30</span>
        </div>
        <div className="reward-bar"><span style={{ width: '80%' }} /></div>
      </div>

      <div className="me-card-grid">
        <div className="mini-card">
          <strong>Videos</strong>
          <span>128</span>
        </div>
        <div className="mini-card">
          <strong>Hours</strong>
          <span>24</span>
        </div>
        <div className="mini-card">
          <strong>Pro</strong>
          <span>Active</span>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Bottom navigation">
      {navTabs.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            className={`nav-item ${isActive ? 'active' : ''} ${key === 'post' ? 'post-tab' : ''}`}
            onClick={() => onChange(key)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="nav-icon-wrap">
              <Icon size={18} />
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
