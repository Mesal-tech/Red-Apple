import { createExpressApp } from '../server';
import http from 'http';
import { AddressInfo } from 'net';
import { extractBiomarkersFromText, evaluateTriage } from '../services/aiAgent.service';

async function runAiTests() {
  console.log('🤖 Starting Red Apple LangGraph & LangChain AI Agent Test Suite (Zero-Fallback)...');

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

    // TEST 3: Zero-Fallback Verification
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
      } else {
        assert('AI endpoint returns 503 instead of fake fallback when LLM is unavailable', res.status === 503);
        assert('Error message clearly indicates AI connection issue', typeof data.error === 'string' && data.error.includes('AI'));
      }
    }

    // TEST 4: Biomarker Extraction Disabled Verification
    {
      const extracted = extractBiomarkersFromText('My period started today with light flow and cramps and headache.');
      assert('Biomarker: hasBiomarkers flag is false (decommissioned)', extracted.hasBiomarkers === false);
      assert('Biomarker: symptoms list is empty', extracted.symptoms.length === 0);
      assert('Biomarker: isPeriodDay is false', extracted.isPeriodDay === false);
    }

    // TEST 5: Clinical Triage & Safety Alert on severe red flags
    {
      const triage = evaluateTriage('I have unbearable excruciating cramps and passed out from extreme pain.');
      assert('Triage: Severe symptoms trigger triage advisory', triage.level === 'consult_doctor');
      assert('Triage: Suggests telemedicine consult for medical safety', triage.suggestTelemedicine === true);
    }

    // TEST 6: Pregnancy Clinical Safety Triage Red Flag
    {
      const triage = evaluateTriage('I have vaginal bleeding and severe sharp cramping', undefined, {
        activeMode: 'pregnancy',
        pregnancy: { currentWeek: 18 },
      });
      assert('Triage: Pregnancy bleeding triggers doctor alert', triage.level === 'consult_doctor');
      assert('Triage: Suggests telemedicine consult during pregnancy', triage.suggestTelemedicine === true);
    }

    // TEST 7: Postmenopause Bleeding Clinical Safety Triage Red Flag
    {
      const triage = evaluateTriage('I noticed unexpected vaginal bleeding and spotting again', undefined, {
        activeMode: 'postmenopause',
      });
      assert('Triage: Postmenopause bleeding triggers doctor alert', triage.level === 'consult_doctor');
      assert('Triage: Suggests telemedicine consult', triage.suggestTelemedicine === true);
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
