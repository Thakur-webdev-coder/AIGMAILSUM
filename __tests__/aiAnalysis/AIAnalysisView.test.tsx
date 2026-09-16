import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { AIAnalysisView } from '../../src/features/aiAnalysis/components/AIAnalysisView';
import { EmailDetailsView } from '../../src/features/emailDetails/components/EmailDetailsView';
import { AppButton } from '../../src/components/common/AppButton';
import type { EmailAnalysis } from '../../src/types/email';

const analysis: EmailAnalysis = {
  emailId: 'gmail-id',
  summary: 'Summary text',
  keyPoints: ['Point one'],
  category: 'Work',
  priority: 'High',
  importantInformation: {
    deadlines: [],
    requirements: [],
    links: [],
    dates: [],
    amounts: [],
    people: [],
    organizations: [],
    actionItems: ['Reply'],
  },
};

const email = {
  id: 'gmail-id',
  sender: 'sender@example.test',
  recipients: ['recipient@example.test'],
  subject: '(No subject)',
  dateTimeLabel: 'Today',
  contentText: 'Hi',
  isRead: true,
  attachments: [],
};

async function render(element: React.ReactElement) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
}

function textValues(renderer: TestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType(Text)
    .flatMap(node =>
      typeof node.props.children === 'string' ? [node.props.children] : [],
    );
}

test('shows compact success banner only after analysis completes', async () => {
  const renderer = await render(
    <AIAnalysisView analysis={analysis} analysisComplete />,
  );

  const values = textValues(renderer);
  expect(values).toContain('✓ AI analysis complete');
  expect(values).toContain('Summary and insights are ready');
  expect(values).toContain('Summary text');
});

test('does not show success banner while analysis is loading', async () => {
  const renderer = await render(
    <AIAnalysisView analysis={analysis} analysisComplete loading />,
  );

  const values = textValues(renderer);
  expect(values).toContain('Analyzing email...');
  expect(values).not.toContain('✓ AI analysis complete');
});

test('changes summarize action label after analysis exists', async () => {
  const renderer = await render(
    <EmailDetailsView email={email} analysis={analysis} />,
  );

  expect(
    renderer.root
      .findAllByType(AppButton)
      .some(button => button.props.label === 'Analyze Again'),
  ).toBe(true);
});
