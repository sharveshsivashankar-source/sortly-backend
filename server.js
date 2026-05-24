require('dotenv').config();

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
// SIMPLE NORMALIZER
// ======================================================

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ======================================================
// KEYWORDS
// ======================================================

const KEYWORDS = {

  Sports: [
    'premier league',
    'champions league',
    'europa league',
    'la liga',
    'serie a',
    'bundesliga',
    'arsenal',
    'chelsea',
    'liverpool',
    'tottenham',
    'spurs',
    'manchester united',
    'man city',
    'real madrid',
    'barcelona',
    'messi',
    'ronaldo',
    'haaland',
    'mbappe',
    'football highlights',
    'match highlights',
    'goal highlights',
    'nba',
    'nfl',
    'ufc',
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
    'gta 5',
    'gta 6',
    'rocket league',
    'apex legends',
    'overwatch',
    'playstation',
    'xbox',
    'esports',
    'fifa'
  ],

  Music: [
    'official music video',
    'lyrics video',
    'spotify',
    'album release',
    'live concert',
    'live performance',
    'dj set',
    'remix',
    'instrumental',
    'hip hop',
    'rap song',
    'pop song',
    'rock band'
  ],

  News: [
    'breaking news',
    'world news',
    'bbc news',
    'cnn',
    'fox news',
    'sky news',
    'election',
    'prime minister',
    'president',
    'white house',
    'government',
    'politics',
    'war update',
    'news briefing',
    'headline news',
    'journalist',
    'international news'
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
    'llm',
    'stable diffusion',
    'midjourney',
    'huggingface',
    'tensorflow',
    'pytorch'
  ],

  Coding: [
    'javascript',
    'python tutorial',
    'react js',
    'node js',
    'express js',
    'typescript',
    'java programming',
    'c++',
    'mongodb',
    'postgresql',
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
    'market crash',
    'coinbase',
    'binance'
  ],

  Business: [
    'startup',
    'entrepreneur',
    'digital marketing',
    'seo marketing',
    'shopify',
    'amazon fba',
    'dropshipping',
    'venture capital',
    'pitch deck'
  ],

  Health: [
    'mental health',
    'nutrition tips',
    'healthy eating',
    'sleep health',
    'stress management',
    'doctor advice'
  ],

  Fitness: [
    'gym workout',
    'bodybuilding',
    'strength training',
    'home workout',
    'weightlifting',
    'crossfit',
    'fat loss'
  ],

  Education: [
    'online course',
    'tutorial',
    'math tutorial',
    'physics lesson',
    'chemistry class',
    'study tips'
  ],

  Comedy: [
    'funny video',
    'comedy skit',
    'stand up comedy',
    'meme compilation',
    'prank video',
    'funny moments'
  ],

  Motivation: [
    'motivational speech',
    'self improvement',
    'life advice',
    'goal setting',
    'inspirational speech'
  ]
};

// ======================================================
// KEYWORD DETECTION
// ONLY CHECK TITLE + CHANNEL
// ======================================================

function detectFolder(title, channel) {

  const searchableText =
    normalize(title + ' ' + channel);

  console.log('SEARCH TEXT:', searchableText);

  for (const [folder, keywords] of Object.entries(KEYWORDS)) {

    for (const kw of keywords) {

      const keyword = normalize(kw);

      // EXACT STRING CHECK
      if (searchableText.includes(keyword)) {

        console.log(
          `MATCHED "${keyword}" -> ${folder}`
        );

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

    const {
      title = '',
      channel = ''
    } = req.body;

    console.log('\n====================');
    console.log('TITLE:', title);
    console.log('CHANNEL:', channel);

    // ==================================================
    // 1. KEYWORD MATCH FIRST
    // ==================================================

    const keywordFolder =
      detectFolder(title, channel);

    if (keywordFolder) {

      return res.json({

        folder: keywordFolder,

        aiTitle:
          title
            .split('|')[0]
            .split('-')[0]
            .trim(),

        method: 'keyword'
      });
    }

    // ==================================================
    // 2. AI FALLBACK
    // ==================================================

    console.log(
      'NO KEYWORD MATCH -> USING AI'
    );

    const completion =
      await groq.chat.completions.create({

        model: 'llama-3.3-70b-versatile',

        temperature: 0.2,

        messages: [

          {
            role: 'system',

            content: `
You are Sortly AI.

Your jobs:
1. Categorise the YouTube video
2. Create a short clean title

Allowed folders:
Sports
Gaming
Music
News
AI
Coding
Finance
Business
Health
Fitness
Education
Comedy
Motivation
Other

Rules:
- Return ONLY JSON
- Pick ONE folder
- aiTitle must be short
- No markdown
- No explanations

FORMAT:

{
  "folder": "FolderName",
  "aiTitle": "Short Title"
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

    let result =
      completion.choices[0]
        .message.content;

    result = result
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    console.log('AI RESPONSE:', result);

    const parsed =
      JSON.parse(result);

    return res.json({

      folder:
        parsed.folder || 'Other',

      aiTitle:
        parsed.aiTitle ||
        title.split('|')[0].trim(),

      method: 'ai'
    });

  } catch (error) {

    console.log('ERROR:', error);

    return res.status(500).json({
      error: 'classification_failed'
    });
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

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );
});
