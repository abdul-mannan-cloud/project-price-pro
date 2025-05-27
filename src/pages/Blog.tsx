import React from "react";
import { Header1 } from "@/components/ui/header";
import { Footerdemo } from "@/components/ui/footer-section";
import { Link } from "react-router-dom";

const posts = [
  {
    id: 1,
    title: "How to Keep Your Small Business Lean",
    excerpt:
      "Learn five easy ways to streamline operations, cut costs, and boost efficiency...",
    date: "May 1, 2025",
  },
  {
    id: 2,
    title: "Maximize Client Satisfaction with Fast Quotes",
    excerpt:
      "Discover best practices for delivering lightning-fast estimates that delight customers...",
    date: "May 8, 2025",
  },
  {
    id: 3,
    title: "Design Trends for Modern Service Websites",
    excerpt:
      "Stay on trend with the latest UI/UX patterns that make service sites stand out...",
    date: "May 15, 2025",
  },
  {
    id: 4,
    title: "Data-Driven Estimating Strategies",
    excerpt:
      "Use analytics to predict project costs and timelines more accurately...",
    date: "May 22, 2025",
  },
  {
    id: 5,
    title: "Leveraging Automation in Quoting",
    excerpt:
      "See how tools like AI and templating can cut your quote turnaround time in half...",
    date: "May 29, 2025",
  },
  {
    id: 6,
    title: "Building Trust with Transparent Pricing",
    excerpt:
      "Why showing clear breakdowns in your estimates wins more repeat business...",
    date: "June 5, 2025",
  },
];

export default function Blog() {
  return (
    <div className="bg-gray-50 flex flex-col">
      <Header1 />

      <main className="min-h-screen container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-12">Our Blog</h1>

        <div className="grid gap-8 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <h2 className="text-2xl font-semibold mb-2">{post.title}</h2>
              <p className="text-sm text-gray-500 mb-4">{post.date}</p>
              <p className="text-gray-700 mb-6">{post.excerpt}</p>
              <Link
                to={`/blog/${post.id}`}
                className="inline-block text-primary-600 hover:underline"
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>
      </main>

      <Footerdemo />
    </div>
  );
}
