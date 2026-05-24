require('dotenv').config();

// ======================================================
// STARTUP LOGS
// ======================================================

console.log('STEP 1: FILE STARTED');

const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

console.log('STEP 2: IMPORTS LOADED');

const app = express();

app.use(cors());
app.use(express.json());

console.log('STEP 3: EXPRESS READY');

// ======================================================
// GROQ SETUP
// ======================================================

let groq = null;

try {

  if (!process.env.GROQ_API_KEY) {
    console.log('WARNING: NO GROQ API KEY');
  } else {

    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    console.log('STEP 4: GROQ READY');
  }

} catch (err) {

  console.log('GROQ INIT ERROR:', err);
}

// ======================================================
// NORMALIZER
// ======================================================

function normalize(text = '') {

  return text
    .toString()
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
    'dj set',
    'remix',
    'instrumental',
    'hip hop',
    'rap song',
    'pop song'
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
    'government',
    'politics',
    'war update',
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
    'graphql',
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
    'market crash',
    'coinbase',
    'binance'
  ],

  Business: [
    'startup',
    'entrepreneur',
    'digital marketing',
    'shopify',
    'amazon fba',
    'dropshipping',
    'venture capital'
  ],

  Health: [
    'mental health',
    'nutrition tips',
    'healthy eating',
    'sleep health',
    'stress management'
  ],

  Fitness: [
    'gym workout',
    'bodybuilding',
    'strength training',
    'weightlifting',
    'fat loss'
  ],

  Education: [
    'online course',
    'tutorial',
    'math tutorial',
    'physics lesson',
    'study tips'
  ],

  Comedy: [
    'funny video',
    'comedy skit',
    'stand up comedy',
    'meme compilation',
    'prank video'
  ],

  Motivation: [
    'motivational speech',
    'self improvement',
    'life advice',
    'goal setting'
  ]
};

// ======================================================
// KEYWORD DETECTION
// ONLY TITLE + CHANNEL
// ======================================================

function detectFolder(title, channel) {

  const searchableText =
    normalize(`${title} ${channel}`);

  console.log(
    'SEARCHABLE TEXT:',
    searchableText
  );

  for (const [folder, keywords] of Object.entries(KEYWORDS)) {

    for (const kw of keywords) {

      const keyword =
        normalize(kw);

      // EXACT STRING MATCH
      if (
        searchableText.includes(keyword)
      ) {

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
// AI TITLE CLEANER
// ======================================================

function basicTitleCleaner(title = '') {

  return title
    .split('|')[0]
    .split('-')[0]
    .trim();
}

// ======================================================
// ROUTE
// ======================================================

app.post('/classify', async (req, res) => {

  console.log('STEP 5: /classify HIT');

  try {

    const {
      title = '',
      channel = ''
    } = req.body || {};

    console.log('TITLE:', title);
    console.log('CHANNEL:', channel);

    // ==================================================
    // 1. KEYWORD MATCH FIRST
    // ==================================================

    const keywordFolder =
      detectFolder(title, channel);

    if (keywordFolder) {

      console.log(
        'KEYWORD RESULT:',
        keywordFolder
      );

      return res.json({

        folder: keywordFolder,

        aiTitle:
          basicTitleCleaner(title),

        method: 'keyword'
      });
    }

    // ==================================================
    // 2. AI FALLBACK
    // ==================================================

    console.log(
      'NO KEYWORDS -> USING AI'
    );

    // safety fallback if groq missing
    if (!groq) {

      console.log(
        'NO GROQ AVAILABLE'
      );

      return res.json({

        folder: 'Other',

        aiTitle:
          basicTitleCleaner(title),

        method: 'fallback'
      });
    }

    const completion =
      await groq.chat.completions.create({

        model:
          'llama-3.3-70b-versatile',

        temperature: 0.2,

        messages: [

          {
            role: 'system',

            content: `
You are Sortly AI.

Tasks:
1. Categorise the video
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

    console.log(
      'GROQ RESPONSE RECEIVED'
    );

    let result =
      completion?.choices?.[0]
        ?.message?.content || '';

    console.log(
      'RAW AI:',
      result
    );

    result = result
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let parsed = null;

    try {

      parsed = JSON.parse(result);

    } catch (jsonError) {

      console.log(
        'JSON PARSE FAILED:',
        jsonError
      );

      return res.json({

        folder: 'Other',

        aiTitle:
          basicTitleCleaner(title),

        method: 'ai-fallback'
      });
    }

    return res.json({

      folder:
        parsed.folder || 'Other',

      aiTitle:
        parsed.aiTitle ||
        basicTitleCleaner(title),

      method: 'ai'
    });

  } catch (error) {

    console.log(
      'ROUTE ERROR:',
      error
    );

    return res.status(500).json({

      error:
        'classification_failed',

      details:
        error.message
    });
  }
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/', (req, res) => {

  res.send(
    'Sortly Server Running'
  );
});

// ======================================================
// SERVER
// ======================================================

const PORT =
  process.env.PORT || 3000;

console.log(
  'STEP 6: STARTING SERVER'
);

app.listen(PORT, () => {

  console.log(
    `SERVER RUNNING ON PORT ${PORT}`
  );
});
