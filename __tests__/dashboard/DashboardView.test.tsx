import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { DashboardView } from '../../src/features/dashboard/components/DashboardView';

const metrics = {
  totalEmails: 10,
  unreadEmails: 2,
  importantEmails: 1,
  highPriorityEmails: 3,
  aiAnalyzedEmails: 4,
  emailsRequiringAction: 5,
};

function textValues(renderer: TestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType(Text)
    .flatMap(node =>
      typeof node.props.children === 'string' ? [node.props.children] : [],
    );
}

async function renderDashboard(element: React.ReactElement) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
}

test('shows only dashboard loading state before metrics are available', async () => {
  const renderer = await renderDashboard(<DashboardView loading />);

  const values = textValues(renderer);
  expect(values).toContain('Loading dashboard...');
  expect(values).not.toContain('Not available');
  expect(values).not.toContain('Total Emails');
});

test('keeps existing metric values visible during refresh', async () => {
  const renderer = await renderDashboard(
    <DashboardView metrics={metrics} pendingActions={[]} refreshing />,
  );

  const values = textValues(renderer);
  expect(values).toContain('10');
  expect(values).toContain('2');
  expect(values).not.toContain('Not available');
});
