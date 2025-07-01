import axios from 'axios';
import { BaseAgent } from './BaseAgent.js';

/**
 * NEXUS SOCIAL INTELLIGENCE AGENT - SOCIAL MEDIA SURVEILLANCE
 * This agent monitors social media, tracks trends, and gathers intelligence from social platforms
 */
export class SocialIntelAgent extends BaseAgent {
  constructor() {
    super('social-intel', 'Social Intelligence Agent');
    this.platforms = {
      twitter: 'https://api.twitter.com/2',
      reddit: 'https://www.reddit.com/r',
      hackernews: 'https://hacker-news.firebaseio.com/v0',
      github: 'https://api.github.com'
    };
    this.capabilities = [
      'trend_monitoring',
      'sentiment_analysis',
      'hashtag_tracking',
      'user_profiling',
      'content_analysis',
      'viral_detection',
      'influence_mapping',
      'real_time_monitoring'
    ];
  }

  async initialize() {
    console.log('📱 Social Intelligence Agent initialized - MONITORING THE SOCIAL WEB!');
    return true;
  }

  async executeTask(task) {
    const { action } = task;

    switch (action) {
      case 'monitor_trends':
        return await this.monitorTrends(task.platform, task.options);
      case 'track_hashtag':
        return await this.trackHashtag(task.hashtag, task.options);
      case 'analyze_sentiment':
        return await this.analyzeSentiment(task.content, task.options);
      case 'monitor_reddit':
        return await this.monitorReddit(task.subreddit, task.options);
      case 'track_github':
        return await this.trackGitHub(task.query, task.options);
      case 'monitor_hackernews':
        return await this.monitorHackerNews(task.options);
      case 'viral_detection':
        return await this.detectViral(task.platform, task.options);
      case 'influence_analysis':
        return await this.analyzeInfluence(task.user, task.platform);
      default:
        throw new Error(`Unknown social intelligence action: ${action}`);
    }
  }

  async monitorTrends(platform = 'all', options = {}) {
    const trends = {};

    if (platform === 'all' || platform === 'hackernews') {
      trends.hackernews = await this.getHackerNewsTrends(options);
    }

    if (platform === 'all' || platform === 'reddit') {
      trends.reddit = await this.getRedditTrends(options);
    }

    if (platform === 'all' || platform === 'github') {
      trends.github = await this.getGitHubTrends(options);
    }

    return {
      success: true,
      platform,
      trends,
      timestamp: new Date().toISOString()
    };
  }

  async getHackerNewsTrends(options = {}) {
    try {
      // Get top stories
      const topStoriesResponse = await axios.get(`${this.platforms.hackernews}/topstories.json`);
      const topStoryIds = topStoriesResponse.data.slice(0, options.limit || 30);

      const stories = [];
      for (const id of topStoryIds) {
        try {
          const storyResponse = await axios.get(`${this.platforms.hackernews}/item/${id}.json`);
          const story = storyResponse.data;
          
          if (story && story.title) {
            stories.push({
              id: story.id,
              title: story.title,
              url: story.url,
              score: story.score,
              comments: story.descendants || 0,
              author: story.by,
              time: new Date(story.time * 1000).toISOString(),
              type: story.type
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch HN story ${id}:`, error.message);
        }
      }

      // Analyze trends
      const keywords = this.extractKeywords(stories.map(s => s.title).join(' '));
      const topDomains = this.analyzeDomains(stories.filter(s => s.url));

      return {
        stories,
        totalStories: stories.length,
        trendingKeywords: keywords.slice(0, 10),
        topDomains: topDomains.slice(0, 5),
        averageScore: Math.round(stories.reduce((sum, s) => sum + s.score, 0) / stories.length),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getRedditTrends(options = {}) {
    try {
      const subreddits = options.subreddits || ['all', 'popular', 'programming', 'technology', 'artificial'];
      const trends = {};

      for (const subreddit of subreddits) {
        try {
          const response = await axios.get(`${this.platforms.reddit}/${subreddit}/hot.json?limit=${options.limit || 25}`, {
            headers: {
              'User-Agent': 'LexOS-Social-Intel/1.0'
            }
          });

          const posts = response.data.data.children.map(child => ({
            id: child.data.id,
            title: child.data.title,
            url: child.data.url,
            score: child.data.score,
            comments: child.data.num_comments,
            author: child.data.author,
            subreddit: child.data.subreddit,
            created: new Date(child.data.created_utc * 1000).toISOString(),
            upvoteRatio: child.data.upvote_ratio
          }));

          trends[subreddit] = {
            posts,
            totalPosts: posts.length,
            averageScore: Math.round(posts.reduce((sum, p) => sum + p.score, 0) / posts.length),
            averageComments: Math.round(posts.reduce((sum, p) => sum + p.comments, 0) / posts.length),
            trendingKeywords: this.extractKeywords(posts.map(p => p.title).join(' ')).slice(0, 10)
          };

        } catch (error) {
          console.warn(`Failed to fetch Reddit trends for r/${subreddit}:`, error.message);
          trends[subreddit] = { error: error.message };
        }
      }

      return {
        subreddits: trends,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getGitHubTrends(options = {}) {
    try {
      const timeframe = options.timeframe || 'daily'; // daily, weekly, monthly
      const language = options.language || '';
      
      let dateFilter = '';
      const now = new Date();
      
      switch (timeframe) {
        case 'daily':
          dateFilter = now.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = `${weekAgo.toISOString().split('T')[0]}..${now.toISOString().split('T')[0]}`;
          break;
        case 'monthly':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter = `${monthAgo.toISOString().split('T')[0]}..${now.toISOString().split('T')[0]}`;
          break;
      }

      const query = `created:${dateFilter}${language ? ` language:${language}` : ''}`;
      
      const response = await axios.get(`${this.platforms.github}/search/repositories`, {
        params: {
          q: query,
          sort: 'stars',
          order: 'desc',
          per_page: options.limit || 30
        },
        headers: {
          'User-Agent': 'LexOS-Social-Intel/1.0'
        }
      });

      const repositories = response.data.items.map(repo => ({
        id: repo.id,
        name: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        created: repo.created_at,
        updated: repo.updated_at,
        owner: repo.owner.login
      }));

      // Analyze programming languages
      const languages = {};
      repositories.forEach(repo => {
        if (repo.language) {
          languages[repo.language] = (languages[repo.language] || 0) + 1;
        }
      });

      const topLanguages = Object.entries(languages)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([lang, count]) => ({ language: lang, count }));

      return {
        repositories,
        totalRepositories: repositories.length,
        topLanguages,
        averageStars: Math.round(repositories.reduce((sum, r) => sum + r.stars, 0) / repositories.length),
        timeframe,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async trackHashtag(hashtag, options = {}) {
    // This would integrate with Twitter API if available
    // For now, we'll simulate hashtag tracking
    
    return {
      success: true,
      hashtag,
      message: 'Hashtag tracking requires Twitter API integration',
      simulatedData: {
        mentions: Math.floor(Math.random() * 10000),
        reach: Math.floor(Math.random() * 100000),
        sentiment: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)],
        topInfluencers: [
          { username: 'tech_guru', followers: 50000, mentions: 15 },
          { username: 'ai_researcher', followers: 25000, mentions: 12 },
          { username: 'startup_founder', followers: 75000, mentions: 8 }
        ]
      },
      timestamp: new Date().toISOString()
    };
  }

  async analyzeSentiment(content, options = {}) {
    // Simple sentiment analysis based on keywords
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'love', 'best', 'perfect', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disgusting', 'pathetic'];
    
    const words = content.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    });
    
    let sentiment = 'neutral';
    if (positiveScore > negativeScore) sentiment = 'positive';
    else if (negativeScore > positiveScore) sentiment = 'negative';
    
    return {
      success: true,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      sentiment,
      confidence: Math.abs(positiveScore - negativeScore) / words.length,
      scores: {
        positive: positiveScore,
        negative: negativeScore,
        neutral: words.length - positiveScore - negativeScore
      },
      timestamp: new Date().toISOString()
    };
  }

  async monitorReddit(subreddit, options = {}) {
    try {
      const response = await axios.get(`${this.platforms.reddit}/${subreddit}/new.json?limit=${options.limit || 50}`, {
        headers: {
          'User-Agent': 'LexOS-Social-Intel/1.0'
        }
      });

      const posts = response.data.data.children.map(child => ({
        id: child.data.id,
        title: child.data.title,
        selftext: child.data.selftext,
        url: child.data.url,
        score: child.data.score,
        comments: child.data.num_comments,
        author: child.data.author,
        created: new Date(child.data.created_utc * 1000).toISOString(),
        upvoteRatio: child.data.upvote_ratio,
        flair: child.data.link_flair_text
      }));

      // Analyze content
      const keywords = this.extractKeywords(posts.map(p => `${p.title} ${p.selftext}`).join(' '));
      const averageSentiment = await this.analyzeBatchSentiment(posts.map(p => p.title));

      return {
        success: true,
        subreddit,
        posts,
        totalPosts: posts.length,
        averageScore: Math.round(posts.reduce((sum, p) => sum + p.score, 0) / posts.length),
        trendingKeywords: keywords.slice(0, 15),
        sentiment: averageSentiment,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async detectViral(platform, options = {}) {
    const viralThresholds = {
      hackernews: { score: 500, comments: 100 },
      reddit: { score: 1000, comments: 200 },
      github: { stars: 100, forks: 20 }
    };

    let viralContent = [];

    if (platform === 'hackernews') {
      const trends = await this.getHackerNewsTrends({ limit: 100 });
      if (trends.stories) {
        viralContent = trends.stories.filter(story => 
          story.score >= viralThresholds.hackernews.score || 
          story.comments >= viralThresholds.hackernews.comments
        );
      }
    }

    return {
      success: true,
      platform,
      viralContent,
      totalViral: viralContent.length,
      thresholds: viralThresholds[platform],
      timestamp: new Date().toISOString()
    };
  }

  extractKeywords(text) {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those']);
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .map(([word, count]) => ({ word, count }));
  }

  analyzeDomains(stories) {
    const domains = {};
    
    stories.forEach(story => {
      if (story.url) {
        try {
          const domain = new URL(story.url).hostname.replace('www.', '');
          domains[domain] = (domains[domain] || 0) + 1;
        } catch (error) {
          // Invalid URL, skip
        }
      }
    });

    return Object.entries(domains)
      .sort(([,a], [,b]) => b - a)
      .map(([domain, count]) => ({ domain, count }));
  }

  async analyzeBatchSentiment(texts) {
    const sentiments = await Promise.all(texts.map(text => this.analyzeSentiment(text)));
    const positive = sentiments.filter(s => s.sentiment === 'positive').length;
    const negative = sentiments.filter(s => s.sentiment === 'negative').length;
    const neutral = sentiments.filter(s => s.sentiment === 'neutral').length;

    return {
      positive,
      negative,
      neutral,
      overall: positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral'
    };
  }

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      type: 'social-intel',
      status: 'active',
      capabilities: this.capabilities,
      supportedPlatforms: Object.keys(this.platforms)
    };
  }
}