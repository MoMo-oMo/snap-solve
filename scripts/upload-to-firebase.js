import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Your Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyAISgucfZuRA38laiexGaAy4k4S4AbpS-s',
  authDomain: 'snapsolve-d4efa.firebaseapp.com',
  projectId: 'snapsolve-d4efa',
  storageBucket: 'snapsolve-d4efa.firebasestorage.app',
  messagingSenderId: '217613541484',
  appId: '1:217613541484:web:a53e831d109496871a3849',
  measurementId: 'G-QF791ECLQ1',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function uploadQuestions() {
  try {
    // Read the questions file
    const questionsPath = path.join(process.cwd(), 'data', 'questions_structured.json');
    const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
    
    console.log(`Found ${questionsData.length} questions to upload...`);
    
    // Upload questions to Firebase
    const questionsCollection = collection(db, 'questions');
    
    for (let i = 0; i < questionsData.length; i++) {
      const question = questionsData[i];
      
      // Create a document with auto-generated ID
      await addDoc(questionsCollection, {
        chapter: question.chapter || 'Chapter 1',
        topic: question.topic || 'algebra',
        question: question.question || '',
        solution: question.solution || [],
        difficulty: question.difficulty || 'medium',
        createdAt: new Date(),
      });
      
      if (i % 10 === 0) {
        console.log(`Uploaded ${i + 1}/${questionsData.length} questions...`);
      }
    }
    
    console.log('✅ All questions uploaded successfully!');
    
    // Also create some sample textbook chapters
    await createSampleChapters();
    
  } catch (error) {
    console.error('❌ Error uploading questions:', error);
  }
}

async function createSampleChapters() {
  console.log('Creating sample textbook chapters...');
  
  const chapters = [
    {
      id: 'chapter-1-sequences',
      title: 'Chapter 1: Sequences and Series',
      content: `This chapter covers quadratic number patterns, arithmetic sequences, geometric sequences, and series.

Key concepts:
- Quadratic number patterns have a constant second difference
- Arithmetic sequences have a constant first difference
- Geometric sequences have a constant ratio
- Series are formed by adding terms of sequences

Important formulas:
- Arithmetic sequence: Tn = a + (n-1)d
- Geometric sequence: Tn = ar^(n-1)
- Sum of arithmetic series: Sn = n/2[2a + (n-1)d]
- Sum of geometric series: Sn = a(r^n - 1)/(r - 1)`,
      examples: [
        {
          question: 'Find the general term of the quadratic sequence 3, 11, 21, 33, ...',
          answer: 'Using the method of differences: Tn = n² + 5n - 3'
        }
      ]
    },
    {
      id: 'chapter-2-functions',
      title: 'Chapter 2: Functions and Inverses',
      content: `This chapter covers functions, their inverses, and transformations.

Key concepts:
- A function maps each input to exactly one output
- Inverse functions reverse the operation of the original function
- Graphs of functions and their inverses are reflections across y = x

Types of functions covered:
- Linear functions
- Quadratic functions
- Exponential functions
- Logarithmic functions
- Square root functions`,
      examples: [
        {
          question: 'Find the inverse of f(x) = 2x + 1',
          answer: 'Swap x and y: x = 2y + 1, solve for y: y = (x-1)/2, so f⁻¹(x) = (x-1)/2'
        }
      ]
    }
  ];
  
  const textbookCollection = collection(db, 'textbook');
  
  for (const chapter of chapters) {
    await setDoc(doc(textbookCollection, chapter.id), {
      title: chapter.title,
      content: chapter.content,
      examples: chapter.examples,
      createdAt: new Date(),
    });
  }
  
  console.log('✅ Sample textbook chapters created!');
}

// Run the upload
uploadQuestions();