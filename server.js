require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.post('/classify', async (req, res) => {

  try {

    const { title, channel } = req.body;

    const completion = await groq.chat.completions.create({

      messages: [
        {
          role: 'user',
          content: `
You are a YouTube sorting assistant.

Analyze the video carefully.

You MUST return ONLY valid JSON.

Rules:
- ALWAYS include "folder"
- ALWAYS include "aiTitle"
- aiTitle must NEVER be null
- aiTitle should be short and human readable
- No markdown
- No explanations
- No code blocks

Available folders:
- AI
- Coding
- Finance
- Business
- Health
- Fitness
- Gaming
- Education
- Music
- Comedy
- News
- Motivation
- Uncategorized

Example response:

{
  "folder": "Music",
  "aiTitle": "Relaxing Jazz Playlist"
}

Video Title:
${title}

Channel:
${channel}
`
        }
      ],

      model: 'llama-3.3-70b-versatile'

    });


    let result = completion.choices[0].message.content;

    result = result.replace(/```json/g, '');
    result = result.replace(/```/g, '');
    result = result.trim();

res.json(JSON.parse(result));    

  } catch (error) {

    console.log(error);

    res.status(500).send('Error');
  }
});

app.listen(3000, () => {

  console.log('Server running on port 3000');

});
