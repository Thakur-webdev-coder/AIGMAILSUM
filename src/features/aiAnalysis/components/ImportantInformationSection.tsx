import React from 'react';
import { SectionCard } from '../../../components/common/SectionCard';
import type { ImportantInformation } from '../../../types/email';
import { AnalysisList } from './AnalysisList';

interface ImportantInformationSectionProps {
  information: ImportantInformation;
}

export function ImportantInformationSection({
  information,
}: ImportantInformationSectionProps) {
  return (
    <SectionCard title="Important Information">
      <AnalysisList title="Deadlines" items={information.deadlines} />
      <AnalysisList title="Dates" items={information.dates} />
      <AnalysisList title="Amounts" items={information.amounts} />
      <AnalysisList title="Requirements" items={information.requirements} />
      <AnalysisList title="Links" items={information.links} />
      {information.people.length > 0 ? (
        <AnalysisList title="People" items={information.people} />
      ) : null}
      {information.organizations.length > 0 ? (
        <AnalysisList title="Organizations" items={information.organizations} />
      ) : null}
    </SectionCard>
  );
}
