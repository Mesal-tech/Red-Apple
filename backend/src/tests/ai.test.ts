import { createExpressApp } from '../server';
import http from 'http';
import { AddressInfo } from 'net';
import {
  extractBiomarkersFromText,
  evaluateTriage,
  formatHealthSummary,
  buildSystemPrompt,
  getSuggestedQuickReplies,
  buildEmergencyReply,
  normalizeText,
  hasUnnegatedMatch,
  agentTools,
  HealthContext,
  streamHealthAgent,
} from '../services/aiAgent.service';

interface TriageTestCase {
  name: string;
  message: string;
  context?: HealthContext;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  expectedLevel: 'normal' | 'monitor' | 'consult_doctor';
  expectedEmergencyCare?: boolean;
  expectedTelemedicine?: boolean;
}

async function runAiTests() {
  console.log('🤖 Starting Red Apple LangGraph Production Agent & Clinical Safety Test Suite...');

  const app = createExpressApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://localhost:${port}/api/ai`;

  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, details?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`, details || '');
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // PART 1: HTTP API Endpoints
    // -------------------------------------------------------------
    // TEST 1: Status endpoint
    {
      const res = await fetch(`${baseUrl}/status`);
      const body = await res.json();
      assert('GET /api/ai/status returns active status', res.status === 200 && body.status === 'active');
      assert('AI provider is Google Gemini & LangGraph', body.provider === 'Google Gemini & LangGraph');
    }

    // TEST 2: Validation of empty message
    {
      const res = await fetch(`${baseUrl}/symptom-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '' }),
      });
      assert('POST /symptom-chat with empty message returns 400', res.status === 400);
    }

    // TEST 3: Zero-Fallback Verification / Integration
    {
      const res = await fetch(`${baseUrl}/symptom-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Can you give me health advice?',
          history: [],
        }),
      });
      const data = await res.json();
      if (res.status === 200) {
        assert('AI response is 200 when Gemini generates response', data.success === true);
        assert('AI generated response is genuine LLM', data.data.isAiGenerated === true);
        assert('Triage is normal for general non-symptom query', data.data.triage.level === 'normal');
      } else {
        assert('AI endpoint returns 503 instead of fake fallback when LLM is unavailable', res.status === 503);
      }
    }

    // -------------------------------------------------------------
    // PART 2: Table-Driven Clinical Triage Test Matrix
    // -------------------------------------------------------------
    console.log('\n🩺 Running Table-Driven Clinical Triage Regression Matrix:');

    const testMatrix: TriageTestCase[] = [
      {
        name: 'Adversative negation scope: "No bleeding at first but now heavy bleeding"',
        message: 'No bleeding at first but now heavy bleeding',
        context: { activeMode: 'pregnancy', pregnancy: { currentWeek: 14 } },
        expectedLevel: 'consult_doctor',
        expectedEmergencyCare: true,
      },
      {
        name: 'Family-history phrasing: "My sister had a miscarriage and now there\'s blood in my underwear"',
        message: "My sister had a miscarriage and now there's blood in my underwear",
        context: { pregnancy: { currentWeek: 9 } },
        expectedLevel: 'consult_doctor',
        expectedEmergencyCare: true,
      },
      {
        name: 'Curly apostrophe normalization: "I can’t feel the baby move"',
        message: 'I can’t feel the baby move',
        context: { activeMode: 'pregnancy', pregnancy: { currentWeek: 28 } },
        expectedLevel: 'consult_doctor',
        expectedEmergencyCare: true,
      },
      {
        name: 'Routine systemic vitals: "My blood pressure was normal today"',
        message: 'My blood pressure was normal today',
        context: { activeMode: 'pregnancy', pregnancy: { currentWeek: 20 } },
        expectedLevel: 'normal',
        expectedEmergencyCare: false,
      },
      {
        name: 'Routine lab testing: "I had a routine glucose blood test yesterday"',
        message: 'I had a routine glucose blood test yesterday',
        context: { activeMode: 'pregnancy', pregnancy: { currentWeek: 24 } },
        expectedLevel: 'normal',
        expectedEmergencyCare: false,
      },
      {
        name: 'Multi-symptom full negation: "No bleeding or pain, just tired"',
        message: 'No bleeding or pain, just tired',
        context: { activeMode: 'pregnancy', pregnancy: { currentWeek: 16 } },
        expectedLevel: 'normal',
        expectedEmergencyCare: false,
      },
      {
        name: 'History scan hygiene: Assistant previous warning does NOT contaminate next turn',
        message: 'ok thanks sis, what should I eat tonight?',
        context: { activeMode: 'pregnancy', pregnancy: { currentWeek: 12 } },
        history: [
          { role: 'user', content: "I had some sharp pain earlier" },
          { role: 'assistant', content: "Vaginal bleeding or sharp cramps during pregnancy require urgent doctor evaluation. Please seek care right away." },
        ],
        expectedLevel: 'normal',
        expectedEmergencyCare: false,
      },
      {
        name: 'Pad count non-emergency: "I bought two pads at the market"',
        message: 'I bought two pads at the market',
        context: { activeMode: 'cycle' },
        expectedLevel: 'normal',
        expectedEmergencyCare: false,
      },
      {
        name: 'Pad soaking acute hemorrhage: "I am soaking through two pads an hour"',
        message: 'I am soaking through two pads an hour',
        context: { activeMode: 'cycle' },
        expectedLevel: 'consult_doctor',
        expectedEmergencyCare: true,
      },
      {
        name: 'Nigerian Pidgin reduced movement: "pikin no dey move since morning"',
        message: 'pikin no dey move since morning',
        context: { activeMode: 'pregnancy' },
        expectedLevel: 'consult_doctor',
        expectedEmergencyCare: true,
      },
      {
        name: 'Nigerian Pidgin pregnancy bleeding: "blood dey comot for my body"',
        message: 'blood dey comot for my body',
        context: { activeMode: 'pregnancy' },
        expectedLevel: 'consult_doctor',
        expectedEmergencyCare: true,
      },
      {
        name: 'Nigerian Pidgin severe pain: "belle dey pain me well well"',
        message: 'belle dey pain me well well',
        context: { activeMode: 'pregnancy' },
        expectedLevel: 'consult_doctor',
        expectedEmergencyCare: true,
      },
      {
        name: 'Nigerian Pidgin ruptured membranes: "water don break at 28 weeks"',
        message: 'water don break at 28 weeks',
        context: { activeMode: 'pregnancy' },
        expectedLevel: 'consult_doctor',
        expectedEmergencyCare: true,
      },
      {
        name: 'Perinatal mental health emergency: "I feel like killing myself, I want to die"',
        message: 'I feel like killing myself, I want to die',
        context: { activeMode: 'pregnancy' },
        expectedLevel: 'consult_doctor',
        expectedEmergencyCare: true,
      },
      {
        name: 'Postmenopausal spotting: "I noticed unexpected spotting and bleeding again"',
        message: 'I noticed unexpected spotting and bleeding again',
        context: { activeMode: 'postmenopause', userAge: 55 },
        expectedLevel: 'consult_doctor',
        expectedEmergencyCare: false,
        expectedTelemedicine: true,
      },
      {
        name: 'Pure third-party inquiry: "My sister was bleeding last month, should she see an OB-GYN?"',
        message: 'My sister was bleeding last month, should she see an OB-GYN?',
        context: { activeMode: 'cycle' },
        expectedLevel: 'normal',
        expectedEmergencyCare: false,
      },
    ];

    for (const testCase of testMatrix) {
      const result = evaluateTriage(testCase.message, undefined, testCase.context, testCase.history);
      const levelMatches = result.level === testCase.expectedLevel;
      const emergencyMatches =
        testCase.expectedEmergencyCare === undefined ||
        result.emergencyCare === testCase.expectedEmergencyCare;
      const telemedMatches =
        testCase.expectedTelemedicine === undefined ||
        result.suggestTelemedicine === testCase.expectedTelemedicine;

      assert(
        `Triage Matrix: ${testCase.name}`,
        levelMatches && emergencyMatches && telemedMatches,
        {
          expected: { level: testCase.expectedLevel, emergencyCare: testCase.expectedEmergencyCare, telemed: testCase.expectedTelemedicine },
          received: { level: result.level, emergencyCare: result.emergencyCare, telemed: result.suggestTelemedicine },
        }
      );
    }

    // -------------------------------------------------------------
    // PART 3: Emergency Offline Template & Normalization
    // -------------------------------------------------------------
    console.log('\n🛡️ Testing Offline Emergency Fallbacks & Normalization:');
    {
      const norm = normalizeText('I can’t feel the baby’s kicks  right now…');
      assert('Normalization: Converts Unicode curly apostrophes to ASCII', norm.includes("can't"));
      assert('Normalization: Converts curly possessive apostrophes to ASCII', norm.includes("baby's"));
      assert('Normalization: Collapses multi-spaces', !norm.includes('  '));

      const emergencyReply = buildEmergencyReply(
        { level: 'consult_doctor', emergencyCare: true, suggestTelemedicine: false },
        { userName: 'Chioma' }
      );
      assert('Emergency Template: Mentions user by name if known', emergencyReply.includes('Chioma'));
      assert('Emergency Template: Commands immediate hospital / emergency care', emergencyReply.includes('emergency room') || emergencyReply.includes('emergency facility'));
      assert('Emergency Template: Mentions Nigerian emergency number 112', emergencyReply.includes('112'));
      assert('Emergency Template: Forbids casual reassurance', !emergencyReply.includes('don\'t worry') && !emergencyReply.includes('Aww babe'));
    }

    // -------------------------------------------------------------
    // PART 4: Production Agent Tools Verification
    // -------------------------------------------------------------
    console.log('\n🔧 Testing Production ReAct Agent Tools:');
    {
      assert('Agent Tools: Exactly 5 production tools registered', agentTools.length === 5);

      const toolNames = agentTools.map((t) => t.name);
      assert('Agent Tools: Includes get_cycle_history', toolNames.includes('get_cycle_history'));
      assert('Agent Tools: Includes log_symptoms', toolNames.includes('log_symptoms'));
      assert('Agent Tools: Includes find_available_doctors', toolNames.includes('find_available_doctors'));
      assert('Agent Tools: Includes book_consultation', toolNames.includes('book_consultation'));
      assert('Agent Tools: Includes set_reminder', toolNames.includes('set_reminder'));

      // Test book_consultation confirmation safety guard
      const bookingTool = agentTools.find((t) => t.name === 'book_consultation');
      const unconfirmedCall = await (bookingTool as any).invoke(
        { doctorId: 'doc_123', scheduledTime: '2026-10-25T14:00:00Z', reason: 'Pelvic checkup', confirmed: false },
        { configurable: { userId: 'usr_test_123' } }
      );
      const unconfirmedData = JSON.parse(unconfirmedCall);
      assert('Booking Tool: Refuses to execute without explicit user confirmation', unconfirmedData.requiresConfirmation === true);
    }

    // -------------------------------------------------------------
    // PART 5: Health Summary (Zero Fabricated Defaults)
    // -------------------------------------------------------------
    console.log('\n📋 Testing Health Summary Grounding:');
    {
      const emptySummary = formatHealthSummary({
        userName: 'Amina',
        activeMode: 'pregnancy',
        pregnancy: null,
      });
      assert('Format Summary: Does NOT fabricate "Avocado"', !emptySummary.includes('Avocado'));
      assert('Format Summary: Does NOT fabricate "Gestational Week 16"', !emptySummary.includes('Gestational Week 16'));
      assert('Format Summary: Marks unknown week', emptySummary.includes('Unknown'));

      const summaryWithMeds = formatHealthSummary({
        userName: 'Zainab',
        userAge: 31,
        medicalProfile: {
          knownConditions: ['Endometriosis'],
          medications: ['Tranexamic Acid 500mg'],
          allergies: ['Amoxicillin'],
          notes: 'Severe dysmenorrhea history',
        },
      });
      assert('Format Summary: Ingests medications', summaryWithMeds.includes('Tranexamic Acid 500mg'));
      assert('Format Summary: Ingests allergies', summaryWithMeds.includes('Amoxicillin'));
      assert('Format Summary: Ingests user age', summaryWithMeds.includes('Age: 31'));
    }

    // -------------------------------------------------------------
    // PART 6: Quick Replies & System Prompt Directives
    // -------------------------------------------------------------
    console.log('\n💬 Testing System Prompts & Quick Replies:');
    {
      const urgentReplies = getSuggestedQuickReplies(undefined, {
        level: 'consult_doctor',
        emergencyCare: true,
        suggestTelemedicine: false,
      });
      assert('Quick Replies: Emergency replies suggest calling 112', urgentReplies.includes('Call Emergency (112)'));

      const prompt = buildSystemPrompt(
        { activeMode: 'pregnancy' },
        { level: 'consult_doctor', emergencyCare: true, suggestTelemedicine: false }
      );
      const promptText = typeof prompt.content === 'string' ? prompt.content : JSON.stringify(prompt.content);
      assert('System Prompt: Injects EMERGENCY OVERRIDE when acute', promptText.includes('MANDATORY EMERGENCY OVERRIDE'));
      assert('System Prompt: Directs to 112 / nearest hospital', promptText.includes('112 in Nigeria'));
      assert('System Prompt: Injects TOOL USAGE DIRECTIVES', promptText.includes('TOOL USAGE DIRECTIVES'));
      assert('System Prompt: Injects log_symptoms directive', promptText.includes('log_symptoms'));
      assert('System Prompt: Injects find_available_doctors directive', promptText.includes('find_available_doctors'));
    }

    // -------------------------------------------------------------
    // PART 7: Agent Streaming Generator Yields Meta & Tool Actions
    // -------------------------------------------------------------
    console.log('\n⚡ Testing Agent Streaming Pipeline:');
    {
      const stream = streamHealthAgent('I feel good today', [], { userName: 'Ada' });
      const firstEvent = await stream.next();
      assert('Stream Agent: Yields immediate meta event first', firstEvent.value?.type === 'meta');
      if (firstEvent.value?.type === 'meta') {
        assert('Stream Agent: Meta event contains valid triage level', firstEvent.value.triage?.level === 'normal');
        assert('Stream Agent: Meta event contains suggested quick replies', Array.isArray(firstEvent.value.suggestedQuickReplies));
      }

      // Emergency streaming
      const emergencyStream = streamHealthAgent('I am soaking through two pads an hour with severe pain', [], { userName: 'Ada' });
      const em1 = await emergencyStream.next();
      assert('Emergency Stream: Meta event indicates emergencyCare: true', em1.value?.type === 'meta' && em1.value.triage?.emergencyCare === true);
      const em2 = await emergencyStream.next();
      assert('Emergency Stream: Immediate emergency chunk provided', em2.value?.type === 'chunk' && em2.value.content?.includes('112 in Nigeria'));
    }

    console.log('\n========================================');
    console.log(`Total tests passed: ${passed}`);
    console.log(`Total tests failed: ${failed}`);
    console.log('========================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  } finally {
    server.close();
  }
}

runAiTests();
