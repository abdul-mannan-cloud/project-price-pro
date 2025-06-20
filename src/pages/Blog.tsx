import React from "react";
import { Header1 } from "@/components/ui/header";
import { Footerdemo } from "@/components/ui/footer-section";
import { Link } from "react-router-dom";
import { Calendar, ArrowRight } from "lucide-react";

const posts = [
  {
    id: 1,
    title: "How to Keep Your Small Business Lean",
    excerpt:
      "Learn five easy ways to streamline operations, cut costs, and boost efficiency for sustainable growth.",
    date: "May 1, 2025",
    readTime: "5 min read",
    category: "Business",
  },
  {
    id: 2,
    title: "Maximize Client Satisfaction with Fast Quotes",
    excerpt:
      "Discover best practices for delivering lightning-fast estimates that delight customers and win more projects.",
    date: "May 8, 2025",
    readTime: "4 min read",
    category: "Strategy",
  },
  {
    id: 3,
    title: "Design Trends for Modern Service Websites",
    excerpt:
      "Stay on trend with the latest UI/UX patterns that make service sites stand out in competitive markets.",
    date: "May 15, 2025",
    readTime: "7 min read",
    category: "Design",
  },
  {
    id: 4,
    title: "Data-Driven Estimating Strategies",
    excerpt:
      "Use analytics to predict project costs and timelines more accurately, reducing risks and improving margins.",
    date: "May 22, 2025",
    readTime: "6 min read",
    category: "Analytics",
  },
  {
    id: 5,
    title: "Leveraging Automation in Quoting",
    excerpt:
      "See how tools like AI and templating can cut your quote turnaround time in half while maintaining accuracy.",
    date: "May 29, 2025",
    readTime: "5 min read",
    category: "Technology",
  },
  {
    id: 6,
    title: "Building Trust with Transparent Pricing",
    excerpt:
      "Why showing clear breakdowns in your estimates wins more repeat business and builds lasting client relationships.",
    date: "June 5, 2025",
    readTime: "4 min read",
    category: "Business",
  },
];

export default function Blog() {
  return (
    <div className="bg-white dark:bg-gray-950 flex flex-col min-h-screen transition-colors">
      <Header1 />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 pt-32 pb-12 md:pb-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6 tracking-tight">
              Insights & Ideas
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Discover strategies, tips, and industry insights to help your
              business thrive in today's competitive landscape.
            </p>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="py-8 md:py-20">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 md:gap-12 lg:gap-16">
              {posts.map((post, index) => (
                <article
                  key={post.id}
                  className={`group ${
                    index === 0
                      ? "lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center"
                      : ""
                  }`}
                >
                  {/* Featured Post Layout */}
                  {index === 0 && (
                    <>
                      <div className="space-y-4 md:space-y-6">
                        <div className="flex items-center gap-3 md:gap-4 text-sm">
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 md:px-3 py-1 rounded-full font-medium text-xs md:text-sm">
                            Featured
                          </span>
                          <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 md:px-3 py-1 rounded-full font-medium text-xs md:text-sm">
                            {post.category}
                          </span>
                        </div>

                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {post.title}
                        </h2>

                        <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                          {post.excerpt}
                        </p>

                        <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                            <span>{post.date}</span>
                          </div>
                          <span>{post.readTime}</span>
                        </div>

                        <Link
                          to={`/blog/${post.id}`}
                          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold group-hover:gap-3 transition-all text-sm md:text-base"
                        >
                          Read Article
                          <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                        </Link>
                      </div>

                      {/* Hide image placeholder on mobile to save space */}
                      <div className="hidden lg:block mt-8 lg:mt-0">
                        <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-gray-200 dark:border-gray-700"></div>
                      </div>
                    </>
                  )}

                  {/* Regular Post Layout */}
                  {index !== 0 && (
                    <div className="border-b border-gray-200 dark:border-gray-800 pb-8 md:pb-12">
                      <div className="flex items-start justify-between gap-4 md:gap-8">
                        <div className="flex-1 space-y-3 md:space-y-4">
                          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm">
                            <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 md:px-3 py-1 rounded-full font-medium">
                              {post.category}
                            </span>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                              <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                              <span>{post.date}</span>
                            </div>
                            <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">
                              {post.readTime}
                            </span>
                          </div>

                          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {post.title}
                          </h2>

                          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                            {post.excerpt}
                          </p>

                          <Link
                            to={`/blog/${post.id}`}
                            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold group-hover:gap-3 transition-all text-sm md:text-base"
                          >
                            Read Article
                            <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                          </Link>
                        </div>

                        {/* Hide small image placeholder on mobile */}
                        <div className="hidden md:block">
                          <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>

            {/* Load More Section */}
            <div className="text-center mt-12 md:mt-16">
              <button className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 md:px-8 py-2 md:py-3 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm md:text-base">
                Load More Articles
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footerdemo />
    </div>
  );
}
