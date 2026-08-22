import 'dotenv/config';
import mongoose from 'mongoose';
import Section from '../models/Section.js';
import Element from '../models/Element.js';

const SECTION_ID = '7001234567';

const sampleSection = {
  sectionId: SECTION_ID,
  sectionName: 'HeroSection',
  pageName: 'Home',
  platform: 'Website',
  isGenerated: true,
  sectionStatus: 'Approved',
  wireframeS3Key: null,
  wireframeUrl: null,
  variations: 1,
  cardGridColumns: 3,
  accentColor: '#ef4444',
  inputModes: ['prompt'],
  generatedJsx: '/* seed placeholder */',
};

const sampleElements = [
  { fieldId: '7001234001', sectionId: SECTION_ID, pageName: 'Home', elementName: 'heroImage',    contentType: 'Image',     content: '/placeholder.jpg' },
  { fieldId: '7001234002', sectionId: SECTION_ID, pageName: 'Home', elementName: 'brandBadge',   contentType: 'Text',      content: 'PULSE FIT' },
  { fieldId: '7001234003', sectionId: SECTION_ID, pageName: 'Home', elementName: 'headlineMain', contentType: 'Text',      content: 'CHALLENGE YOUR LIMITS' },
  { fieldId: '7001234004', sectionId: SECTION_ID, pageName: 'Home', elementName: 'headlineSub',  contentType: 'Text',      content: "Be a part of the tribe that's limitless." },
  { fieldId: '7001234005', sectionId: SECTION_ID, pageName: 'Home', elementName: 'description',  contentType: 'Textfield', content: 'Join trainer-led workout sessions designed to kickstart your fitness journey.' },
  { fieldId: '7001234006', sectionId: SECTION_ID, pageName: 'Home', elementName: 'ctaButton',    contentType: 'Button',    content: 'FIND A WORKOUT' },
  {
    fieldId: '7001234007',
    sectionId: SECTION_ID,
    pageName: 'Home',
    elementName: 'statBadges',
    contentType: 'Cards',
    content: '',
    loop: [
      { fieldId1: '7001234008', fieldId2: '7001234009', value1: '1000+', value2: 'Community Members' },
      { fieldId1: '7001234010', fieldId2: '7001234011', value1: '40+',   value2: 'Fitness Programmes' },
      { fieldId1: '7001234012', fieldId2: '7001234013', value1: '150+',  value2: 'Fitness Channels' },
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codex');
  await Section.deleteOne({ sectionId: SECTION_ID });
  await Element.deleteMany({ sectionId: SECTION_ID });
  await Section.create(sampleSection);
  await Element.insertMany(sampleElements);
  console.log('✅ Seed complete — section:', SECTION_ID);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
