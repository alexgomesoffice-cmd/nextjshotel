"use client"
import { useState } from "react";


import { Heart, MessageCircle, Share2, Clock, BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";


// ============= Dummy blog data (no backend) =============
interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  likes: number;
  comments: number;
  images: string[];
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: 1,
    title: "Hidden Beaches of Cox's Bazar You Must Explore",
    excerpt:
      "From the longest sea beach in the world to secret coves only locals know — here is your ultimate guide to the coastline of Cox's Bazar.",
    author: "Tahmid Rahman",
    date: "Jun 24, 2026",
    readTime: "6 min read",
    category: "Beaches",
    likes: 248,
    comments: 36,
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
      "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=600&q=80",
      "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=600&q=80",
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&q=80",
    ],
  },
  {
    id: 2,
    title: "A Weekend Retreat in the Sajek Valley Clouds",
    excerpt:
      "Wake up above the clouds. We spent 48 hours in Sajek and rounded up the best resorts, viewpoints and sunrise spots for your next escape.",
    author: "Nusrat Jahan",
    date: "Jun 18, 2026",
    readTime: "8 min read",
    category: "Mountains",
    likes: 412,
    comments: 58,
    images: [
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
      "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&q=80",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80",
    ],
  },
  {
    id: 3,
    title: "Luxury Stays in Dhaka That Feel Like a Getaway",
    excerpt:
      "You don't need to leave the city to feel pampered. These five-star hotels bring rooftop pools, spas and skyline views to the capital.",
    author: "Imran Hossain",
    date: "Jun 11, 2026",
    readTime: "5 min read",
    category: "City Life",
    likes: 187,
    comments: 24,
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&q=80",
    ],
  },
  {
    id: 4,
    title: "Exploring the Sundarbans: A Traveler's Journal",
    excerpt:
      "Boats, mangroves and the elusive Royal Bengal Tiger. Our photo journal from the world's largest mangrove forest will inspire your trip.",
    author: "Farzana Akter",
    date: "Jun 03, 2026",
    readTime: "10 min read",
    category: "Nature",
    likes: 533,
    comments: 71,
    images: [
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
      "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=600&q=80",
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80",
    ],
  },
  {
    id: 5,
    title: "The Tea Gardens of Sylhet at Golden Hour",
    excerpt:
      "Endless rolling green and the smell of fresh leaves. We chase the perfect light across Sylhet's most photogenic tea estates.",
    author: "Sabbir Ahmed",
    date: "May 28, 2026",
    readTime: "7 min read",
    category: "Nature",
    likes: 296,
    comments: 41,
    images: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
      "https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&q=80",
      "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=600&q=80",
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80",
    ],
  },
  {
    id: 6,
    title: "Foodie's Map: Street Eats Across Old Dhaka",
    excerpt:
      "Biryani, kebabs and centuries-old sweet shops. Follow our hand-drawn map through the most delicious lanes of Old Dhaka.",
    author: "Rifat Chowdhury",
    date: "May 19, 2026",
    readTime: "9 min read",
    category: "Food",
    likes: 358,
    comments: 49,
    images: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
    ],
  },
];

// Renders an image grid layout that adapts to the number of images
const ImageGrid = ({ images, title }: { images: string[]; title: string }) => {
  const count = images.length;

  if (count === 1) {
    return (
      <div className="overflow-hidden rounded-xl">
        <img
          src={images[0]}
          alt={title}
          className="w-full h-72 object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${title} ${i + 1}`}
            className="w-full h-64 object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-2 rounded-xl overflow-hidden h-80">
        <img
          src={images[0]}
          alt={`${title} 1`}
          className="w-full h-full object-cover row-span-2 transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <img
          src={images[1]}
          alt={`${title} 2`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <img
          src={images[2]}
          alt={`${title} 3`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      </div>
    );
  }

  // 4+ images: 2x2 grid, overlay "+N" on last tile
  const extra = count - 4;
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-2 rounded-xl overflow-hidden h-80">
      {images.slice(0, 4).map((src, i) => (
        <div key={i} className="relative w-full h-full overflow-hidden">
          <img
            src={src}
            alt={`${title} ${i + 1}`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          {i === 3 && extra > 0 && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
              <span className="text-2xl font-bold text-foreground">+{extra}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const BlogCard = ({ post, index }: { post: BlogPost; index: number }) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes);

  const handleLike = () => {
    setLiked((prev) => {
      setLikes((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/blog#post-${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text: post.excerpt, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", description: "Blog link copied to clipboard." });
      }
    } catch {
      /* user cancelled share */
    }
  };

  const handleComment = () => {
    toast({ title: "Comments", description: `${post.comments} comments on "${post.title}".` });
  };

  return (
    <article
      id={`post-${post.id}`}
      className="group glass rounded-2xl overflow-hidden hover-lift animate-fade-in-up flex flex-col"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="p-5 pb-3 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary-foreground">
            {post.author.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{post.author}</p>
          <p className="text-xs text-muted-foreground">{post.date}</p>
        </div>
        <span className="ml-auto text-xs px-3 py-1 rounded-full bg-primary/15 text-primary font-medium">
          {post.category}
        </span>
      </div>

      <div className="px-5">
        <ImageGrid images={post.images} title={post.title} />
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
          {post.title}
        </h2>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.excerpt}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <Clock className="h-3.5 w-3.5" />
          {post.readTime}
        </div>

        {/* Action bar: heart left, comment center, share right */}
        <div className="mt-auto grid grid-cols-3 items-center border-t border-border/50 pt-3">
          <button
            onClick={handleLike}
            className="flex items-center justify-start gap-2 text-sm font-medium transition-colors hover:text-destructive group/like"
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-all duration-300 group-hover/like:scale-110",
                liked ? "fill-destructive text-destructive" : "text-muted-foreground"
              )}
            />
            <span className={cn(liked ? "text-destructive" : "text-muted-foreground")}>{likes}</span>
          </button>

          <button
            onClick={handleComment}
            className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <MessageCircle className="h-5 w-5 transition-transform duration-300 hover:scale-110" />
            <span>{post.comments}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-end gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
          >
            <Share2 className="h-5 w-5 transition-transform duration-300 hover:scale-110" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>
    </article>
  );
};

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">

      <main className="pt-28 pb-24 ">
        <div className="max-w-7xl container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-medium mb-4">
              <BookOpen className="h-4 w-4" /> StayVista Journal
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Travel <span className="text-gradient">Stories</span> & Guides
            </h1>
            <p className="text-muted-foreground text-lg">
              Inspiration, hidden gems and travel tips from across Bangladesh and beyond.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {BLOG_POSTS.map((post, index) => (
              <BlogCard key={post.id} post={post} index={index} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Blog;
