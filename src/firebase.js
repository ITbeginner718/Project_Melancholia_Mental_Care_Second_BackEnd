
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

// JSON 파일을 import 하기 위한 require 생성
// @ts-ignore
const require = createRequire(import.meta.url);
// @ts-ignore
const serviceAccount = require('../project-mentalcare-firebase-adminsdk-afk11-578a767bc2.json');


// Admin SDK 초기화
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

// Firestore 접근
const db = getFirestore();


export{db}