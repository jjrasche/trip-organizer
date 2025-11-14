// Quick test script to verify Gemini API works with Firebase key
import { GoogleGenerativeAI } from '@google/generative-ai';

const FIREBASE_API_KEY = 'AIzaSyAFNJYdKTmaCbRyYCLsg1XranHlBKIbK_s';

async function testGemini() {
  console.log('Testing Gemini API with Firebase API key...\n');

  try {
    const genAI = new GoogleGenerativeAI(FIREBASE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent('Say "Hello from Gemini!" if you can read this.');
    const response = await result.response;
    const text = response.text();

    console.log('✅ SUCCESS! Gemini AI is working!\n');
    console.log('Response:', text);
    console.log('\nYour Firebase API key works with Gemini! 🎉');
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('\nThe Firebase API key does NOT work with Gemini.');
    console.log('You need to get a separate Gemini API key from:');
    console.log('https://aistudio.google.com/app/apikey');
  }
}

testGemini();
