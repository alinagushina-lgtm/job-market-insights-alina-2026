export const JOB_TITLE_OPTIONS = [
  { label: "Разработчик ПО", query: "Software Developer" },
  { label: "Аналитик данных", query: "Data Analyst" },
  { label: "Бизнес-аналитик", query: "Business Analyst" },
  { label: "Тестировщик", query: "QA Engineer" },
  { label: "DevOps-инженер", query: "DevOps Engineer" },
  { label: "Менеджер проектов", query: "Project Manager" },
  { label: "Продакт-менеджер", query: "Product Manager" },
  { label: "UX/UI-дизайнер", query: "UX/UI Designer" },
  { label: "Маркетолог", query: "Marketing Specialist" },
  { label: "Менеджер по продажам", query: "Sales Manager" },
  { label: "Специалист поддержки", query: "Customer Support Specialist" },
  { label: "HR-специалист", query: "HR Specialist" },
  { label: "Рекрутер", query: "Recruiter" },
  { label: "Бухгалтер", query: "Accountant" },
  { label: "Финансовый аналитик", query: "Financial Analyst" },
  { label: "Юрист", query: "Lawyer" },
] as const

const JOB_TITLE_BY_LABEL = new Map(
  JOB_TITLE_OPTIONS.map((option) => [option.label.toLocaleLowerCase("ru"), option.query]),
)

export function resolveJobTitle(value: string) {
  const trimmed = value.trim()
  return JOB_TITLE_BY_LABEL.get(trimmed.toLocaleLowerCase("ru")) ?? trimmed
}
