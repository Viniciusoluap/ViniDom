import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Home, RefreshCw, Share2, Smartphone } from 'lucide-react';

const IOS_STEPS = [
  <>Abra <strong>vcvisagismo.com</strong> no Safari ou no Google Chrome do iPhone.</>,
  <>Toque no botão <strong>Compartilhar</strong> <Share2 size={16} className="inline-block align-[-2px] text-gold-400" aria-label="ícone de compartilhamento" /> ou no menu do navegador.</>,
  <>Selecione <strong>“Adicionar à Tela de Início”</strong>. Se a opção não aparecer de imediato, role a lista de ações.</>,
  <>Confirme em <strong>“Adicionar”</strong> e abra o atalho pelo ícone VC na tela inicial.</>,
];

const ANDROID_STEPS = [
  <>Abra <strong>vcvisagismo.com</strong> no Google Chrome do Android.</>,
  <>Toque no menu <strong>⋮</strong> do navegador e escolha <strong>“Adicionar à tela inicial”</strong> ou <strong>“Instalar aplicativo”</strong>, conforme a opção exibida.</>,
  <>Confirme a inclusão e abra pelo ícone VC criado na tela inicial.</>,
];

function StepCard({ title, steps }) {
  return (
    <section className="border border-gold-700/50 bg-brand-800/80 p-6 sm:p-8" aria-label={title}>
      <h2 className="flex items-center gap-3 text-gold-400 text-lg font-semibold mb-7">
        <Smartphone size={22} aria-hidden="true" /> {title}
      </h2>
      <ol className="space-y-5">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-4 text-brand-200 text-sm sm:text-base leading-relaxed">
            <span className="shrink-0 flex items-center justify-center w-7 h-7 border border-gold-600 text-gold-400 text-xs font-semibold" aria-hidden="true">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function InstallApp() {
  return (
    <div className="flex-1 bg-brand-900 text-white pt-24 pb-20 px-6 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-brand-300 hover:text-gold-400 text-sm mb-10 transition-colors">
          <ArrowLeft size={17} aria-hidden="true" /> Voltar
        </Link>

        <div className="text-center mb-12">
          <img src="/icon-vc.png" alt="Monograma VC de Vinicius Cavalcante" className="w-24 h-24 mx-auto mb-7 border border-gold-700/40" />
          <p className="text-gold-400 text-xs uppercase tracking-ultra font-semibold mb-4">Seu acesso sempre à mão</p>
          <h1 className="text-3xl sm:text-5xl font-light tracking-tight mb-6">Instale nosso aplicativo</h1>
          <p className="max-w-2xl mx-auto text-brand-300 text-base sm:text-lg leading-relaxed">
            Adicione Vinicius Cavalcante à tela inicial do celular para acessar o agendamento, consultar os serviços e falar conosco com poucos toques.
          </p>
          <p className="text-brand-400 text-sm mt-5">Endereço oficial: <strong className="text-gold-400 font-medium">vcvisagismo.com</strong></p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <StepCard title="iPhone (Safari ou Chrome)" steps={IOS_STEPS} />
          <StepCard title="Android (Google Chrome)" steps={ANDROID_STEPS} />
        </div>

        <section className="mt-6 border border-gold-700/50 bg-brand-800/80 p-6 sm:p-8">
          <h2 className="text-gold-400 text-lg font-semibold mb-5 flex items-center gap-3"><Check size={22} aria-hidden="true" /> Depois de adicionar</h2>
          <div className="grid sm:grid-cols-2 gap-5 text-brand-200 text-sm sm:text-base leading-relaxed">
            <p className="flex gap-3"><Home size={19} className="shrink-0 text-gold-400 mt-0.5" aria-hidden="true" /> O ícone VC ficará na tela inicial para abrir o site rapidamente.</p>
            <p className="flex gap-3"><RefreshCw size={19} className="shrink-0 text-gold-400 mt-0.5" aria-hidden="true" /> Os serviços e horários exibidos vêm do site sempre que você acessá-lo.</p>
          </div>
        </section>

        <p className="text-center text-brand-400 text-xs sm:text-sm leading-relaxed mt-10 max-w-2xl mx-auto">
          A aparência dos menus pode variar conforme o celular e a versão do navegador. O acesso é feito diretamente pelo site Vinicius Cavalcante, sem download pela App Store ou Google Play.
        </p>
      </div>
    </div>
  );
}
