import React from 'react';

interface ContentPolicyPageProps {
  onBack: () => void;
}

const Section: React.FC<{ title: string; emoji: string; children: React.ReactNode }> = ({ title, emoji, children }) => (
  <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
      <span>{emoji}</span> {title}
    </h2>
    {children}
  </section>
);

const Rule: React.FC<{ allowed: boolean; children: React.ReactNode }> = ({ allowed, children }) => (
  <li className="flex items-start gap-3 py-2">
    <span className={`mt-0.5 text-sm font-bold shrink-0 ${allowed ? 'text-green-500' : 'text-red-500'}`}>
      {allowed ? '✓' : '✕'}
    </span>
    <span className="text-sm text-gray-700">{children}</span>
  </li>
);

const ContentPolicyPage: React.FC<ContentPolicyPageProps> = ({ onBack }) => (
  <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
    <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
      ← Back
    </button>

    <div className="text-center py-6">
      <p className="text-4xl mb-3">☬</p>
      <h1 className="text-2xl font-bold text-gray-900">Content Policy</h1>
      <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">
        Hukumnama AI Studio exists to celebrate and share Sikh spiritual wisdom.
        Every generation decision is guided by deep respect for the Sikh faith, its Gurus, and its teachings.
      </p>
    </div>

    <Section title="Our Commitment" emoji="🤝">
      <p className="text-sm text-gray-600 leading-relaxed">
        We believe AI can be a powerful tool for spreading the message of Gurbani — but only when used
        with the same reverence a Sikh brings to the Gurdwara. This policy defines what we will and
        will not generate, and why.
      </p>
      <p className="text-sm text-gray-600 leading-relaxed mt-3">
        Our safety layer runs on every single generation — automatically, before any credits are spent.
        Violations are logged and reviewed. No exceptions.
      </p>
    </Section>

    <Section title="What We Will Not Generate" emoji="🚫">
      <p className="text-xs text-gray-500 mb-3">These are hard rules. No override, no exception.</p>
      <ul className="space-y-1 divide-y divide-gray-50">
        <Rule allowed={false}>
          Facial or bodily depictions of any of the Ten Sikh Gurus — in any art style, realistic or abstract
        </Rule>
        <Rule allowed={false}>
          Mockery, parody, or satire of Gurbani, Sikh prayers, or religious practices
        </Rule>
        <Rule allowed={false}>
          Content that sexualizes Gurdwaras, religious symbols, or any Sikh figure
        </Rule>
        <Rule allowed={false}>
          Political propaganda using Sikh religious imagery (any party, any ideology)
        </Rule>
        <Rule allowed={false}>
          Hate speech or content demeaning any community, religion, or ethnicity
        </Rule>
        <Rule allowed={false}>
          Violence glorification in a religious context
        </Rule>
        <Rule allowed={false}>
          Extremist or terrorist content of any kind
        </Rule>
      </ul>
    </Section>

    <Section title="What We Fully Support" emoji="✅">
      <ul className="space-y-1 divide-y divide-gray-50">
        <Rule allowed={true}>
          Spiritual backgrounds for Hukumnama and Gurbani quote cards
        </Rule>
        <Rule allowed={true}>
          Abstract Khanda, Nishan Sahib, and Ik Onkar artwork (non-figurative)
        </Rule>
        <Rule allowed={true}>
          Gurdwara architecture, landscapes, and natural scenes
        </Rule>
        <Rule allowed={true}>
          Gurpurab and festival celebration posters and reels
        </Rule>
        <Rule allowed={true}>
          Community life, Langar, Seva, and devotional artwork
        </Rule>
        <Rule allowed={true}>
          Inspirational cards for morning Ardas, Simran, and daily reflection
        </Rule>
        <Rule allowed={true}>
          Content in Punjabi and English that respectfully shares Sikh wisdom
        </Rule>
      </ul>
    </Section>

    <Section title="How Our Safety Layer Works" emoji="🛡️">
      <ol className="space-y-3 text-sm text-gray-600">
        <li className="flex gap-3">
          <span className="font-bold text-navy-900 shrink-0">1.</span>
          <span><strong>Keyword blocklist</strong> — instant check against patterns that indicate policy violations. Fast and non-bypassable.</span>
        </li>
        <li className="flex gap-3">
          <span className="font-bold text-navy-900 shrink-0">2.</span>
          <span><strong>Gemini safety review</strong> — a separate AI call evaluates your prompt against our content guidelines before any image or video is generated.</span>
        </li>
        <li className="flex gap-3">
          <span className="font-bold text-navy-900 shrink-0">3.</span>
          <span><strong>Refusal logging</strong> — every rejected prompt is recorded for human review. This helps us improve the system and catch emerging abuse patterns.</span>
        </li>
        <li className="flex gap-3">
          <span className="font-bold text-navy-900 shrink-0">4.</span>
          <span><strong>No credit loss</strong> — safety checks run before credits are deducted. A rejected prompt costs nothing.</span>
        </li>
      </ol>
    </Section>

    <Section title="The Ten Gurus — Special Protection" emoji="🙏">
      <p className="text-sm text-gray-600 leading-relaxed">
        The Ten Sikh Gurus are held in the highest reverence. Hukumnama AI Studio will never generate
        images purporting to depict their faces, bodies, or physical appearance — regardless of the
        artistic style requested. This applies to: Guru Nanak Dev Ji, Guru Angad Dev Ji,
        Guru Amar Das Ji, Guru Ram Das Ji, Guru Arjan Dev Ji, Guru Hargobind Sahib Ji,
        Guru Har Rai Ji, Guru Har Krishan Sahib Ji, Guru Tegh Bahadur Ji, and Guru Gobind Singh Ji.
      </p>
      <p className="text-sm text-gray-600 leading-relaxed mt-3">
        Gurbani, as enshrined in Sri Guru Granth Sahib Ji, is treated as the living Guru.
        We generate content <em>inspired by</em> its wisdom — never content that mocks, alters,
        or misrepresents it.
      </p>
    </Section>

    <Section title="Reporting a Concern" emoji="📬">
      <p className="text-sm text-gray-600 leading-relaxed">
        If you see content generated through our platform that you believe violates this policy,
        or if our safety system rejected a legitimate prompt you believe should be allowed,
        please contact us. Your feedback directly improves the system.
      </p>
      <p className="text-sm text-gray-500 mt-3">
        This policy was last updated June 2026. It will evolve as our understanding of edge cases deepens.
      </p>
    </Section>
  </div>
);

export default ContentPolicyPage;
