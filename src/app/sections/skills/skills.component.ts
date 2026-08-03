import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SkillGroup {
  label: string;
  skills: string[];
}

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skills.component.html',
  styleUrl: './skills.component.scss',
})
export class SkillsComponent {
  groups: SkillGroup[] = [
    { label: 'Frontend', skills: ['Angular', 'TypeScript', 'JavaScript', 'RxJS', 'NgRx', 'HTML', 'CSS', 'Node.js'] },
    { label: 'Backend', skills: ['Python', 'REST APIs'] },
    { label: 'Cloud & DevOps', skills: ['AWS', 'Docker', 'CI/CD', 'Azure'] },
    {
      label: 'Leadership',
      skills: ['Team Mentoring', 'Hiring & Onboarding', 'Coding Standards', 'Code Reviews', 'Stakeholder Management'],
    },
    { label: 'Tools', skills: ['Git', 'Jira', 'Storybook'] },
    {
      label: 'AI-Assisted Engineering',
      skills: ['Claude Code', 'GitHub Copilot', 'OpenAI Codex', 'LLM Agents & Sub-agents', 'Custom Dev Tooling'],
    },
  ];
}
