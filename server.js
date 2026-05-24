require('dotenv').config();

throw new Error('NEW CODE IS RUNNING');

const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ======================================================
// NORMALIZER
// ======================================================

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ======================================================
// HARD KEYWORDS
// ONE EXACT MATCH = INSTANT CATEGORY
// ======================================================

const KEYWORDS = {
  Sports: [
    'premier league',
    'champions league',
    'europa league',
    'conference league',
    'la liga',
    'serie a',
    'bundesliga',
    'ligue 1',
    'eredivisie',
    'world cup',
    'arsenal',
    'chelsea',
    'liverpool',
    'manchester united',
    'man utd',
    'man city',
    'tottenham',
    'spurs',
    'newcastle united',
    'real madrid',
    'barcelona',
    'bayern munich',
    'psg',
    'juventus',
    'messi',
    'ronaldo',
    'haaland',
    'mbappe',
    'football highlights',
    'match highlights',
    'goal highlights',
    'transfer news',
    'nba',
    'nfl',
    'ufc',
    'mma',
    'boxing',
    'formula 1',
    'wimbledon'
  ],

  Gaming: [
    'minecraft',
    'fortnite',
    'roblox',
    'valorant',
    'league of legends',
    'call of duty',
    'warzone',
    'csgo',
    'counter strike',
    'gta 5',
    'gta 6',
    'apex legends',
    'rocket league',
    'dota 2',
    'overwatch',
    'playstation',
    'xbox',
    'nintendo switch',
    'twitch stream',
    'esports',
    'fifa'
  ],

  Music: [
    'official music video',
    'lyrics video',
    'spotify',
    'apple music',
    'soundcloud',
    'album release',
    'single release',
    'live concert',
    'live performance',
    'dj set',
    'remix',
    'instrumental',
    'hip hop',
    'rap song',
    'rnb',
    'pop song',
    'rock band',
    'music festival'
  ],

  News: [
    'breaking news',
    'world news',
    'uk news',
    'us news',
    'cnn',
    'bbc news',
    'fox news',
    'sky news',
    'election',
    'parliament',
    'prime minister',
    'president',
    'white house',
    'government',
    'politics',
    'political debate',
    'war update',
    'conflict update',
    'news briefing',
    'headline news',
    'press conference',
    'journalist',
    'live report',
    'daily news',
    'news update',
    'international news',
    'court ruling',
    'investigation',
    'breaking story',
    'media coverage'
  ],

  AI: [
    'chatgpt',
    'openai',
    'gpt 4',
    'gpt 5',
    'claude ai',
    'gemini ai',
    'machine learning',
    'deep learning',
    'neural network',
    'llm',
    'ai tools',
    'prompt engineering',
    'stable diffusion',
    'midjourney',
    'huggingface',
    'tensorflow',
    'pytorch',
    'generative ai'
  ],

  Coding: [
    'javascript',
    'python tutorial',
    'react js',
    'node js',
    'express js',
    'next js',
    'typescript',
    'java programming',
    'c++',
    'swift ios',
    'kotlin android',
    'tailwind css',
    'mongodb',
    'postgresql',
    'mysql',
    'graphql',
    'rest api',
    'docker',
    'kubernetes',
    'leetcode'
  ],

  Finance: [
    'bitcoin',
    'ethereum',
    'crypto trading',
    'stock market',
    'forex',
    'nasdaq',
    's&p 500',
    'day trading',
    'bull market',
    'bear market',
    'market crash',
    'financial freedom',
    'coinbase',
    'binance'
  ],

  Business: [
    'startup',
    'entrepreneur',
    'digital marketing',
    'seo marketing',
    'affiliate marketing',
    'shopify',
    'amazon fba',
    'dropshipping',
    'business ideas',
    'sales funnel',
    'lead generation',
    'startup funding',
    'venture capital',
    'pitch deck'
  ],

  Health: [
    'mental health',
    'therapy session',
    'nutrition tips',
    'healthy eating',
    'sleep health',
    'stress management',
    'anxiety relief',
    'doctor advice',
    'medical tips',
    'immune system',
    'gut health'
  ],

  Fitness: [
    'gym workout',
    'bodybuilding',
    'strength training',
    'home workout',
    'weightlifting',
    'crossfit',
    'hiit workout',
    'fitness transformation',
    'protein diet',
    'muscle building',
    'fat loss'
  ],

  Education: [
    'online course',
    'tutorial lesson',
    'science explanation',
    'math tutorial',
    'physics lesson',
    'chemistry class',
    'history documentary',
    'language learning',
    'study tips',
    'exam preparation'
  ],

  Comedy: [
    'funny video',
    'comedy skit',
    'stand up comedy',
    'meme compilation',
    'prank video',
    'funny moments',
    'viral memes',
    'laugh challenge',
    'funny fails',
    'parody video'
  ],

  Motivation: [
    'motivational speech',
    'success mindset',
    'discipline motivation',
    'self improvement',
    'morning motivation',
    'life advice',
    'positive thinking',
    'goal setting',
    'never give up',
    'inspirational speech'
  ]
};

// ======================================================
// EXACT STRING MATCH ALGORITHM
// ======================================================

function detectFolder(text) {
  const t = normalize(text);
  console.log('NORMALIZED TEXT BEING TESTED:', t);

  for (const [folder, keywords] of Object.entries(KEYWORDS)) {
    for (const kw of keywords) {
      const keyword = normalize(kw);

      // EXACT STRING / PHRASE MATCH BOUNDARIES
      const regex = new RegExp(
        `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
        'i'
      );

      if (regex.test(t)) {
        console.log(`MATCHED EXACT "${kw}" -> ${folder}`);
        return folder;
      }
    }
  }
  return null;
}

// ======================================================
// ROUTE
// ======================================================

app.post('/classify', async (req, res) => {
  try {
    const { title = '', channel = '' } = req.body;

    // Fix: Combine title and channel together so keywords present 
    // inside either field get matched before falling back to AI.
    const combined = `${title} ${channel}`;

    console.log('\n====================');
    console.log('TITLE:', title);
    console.log('CHANNEL:', channel);

    // ==================================================
    // 1. KEYWORD MATCH FIRST
    // ==================================================
    const keywordFolder = detectFolder(combined);

    if (keywordFolder) {
      console.log('KEYWORD CATEGORY:', keywordFolder);

      return res.json({
        folder: keywordFolder,
        aiTitle: title.split('|')[0].trim(),
        method: 'keyword'
      });
    }

    // ==================================================
    // 2. AI FALLBACK
    // ==================================================
    console.log('NO KEYWORD MATCH -> USING AI');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `
You are Sortly AI.

Your tasks:
1. Classify the video
2. Create a short clean title

Allowed folders:
AI
Coding
Finance
Business
Health
Fitness
Gaming
Education
Music
Comedy
News
Sports
Motivation
Other

Rules:
- Return ONLY valid JSON
- Pick ONE folder only
- aiTitle must be short and readable
- No markdown
- No explanations

JSON FORMAT:
{
  "folder": "FolderName",
  "aiTitle": "Short title"
}
`
        },
        {
          role: 'user',
          content: `
Title:
${title}

Channel:
${channel}
`
        }
      ]
    });

    let result = completion.choices[0].message.content;

    result = result
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    console.log('AI RESPONSE:', result);

    const parsed = JSON.parse(result);

    return res.json({
      folder: parsed.folder || 'Other',
      aiTitle: parsed.aiTitle || title.split('|')[0].trim(),
      method: 'ai'
    });

  } catch (error) {
    console.log('ERROR:', error);
    return res.status(500).json({ error: 'classification_failed' });
  }
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/', (req, res) => {
  res.send('Sortly Server Running');
});

// ======================================================
// SERVER
// ======================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
