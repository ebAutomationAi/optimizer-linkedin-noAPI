import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
    createContext,
    useContext,
  } from 'react';
  
  // -------------------------------
  // 1. ERROR BOUNDARY
  // -------------------------------
  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
      console.error('Error caught by Boundary:', error, errorInfo);
    }
    render() {
      if (this.state.hasError) {
        return (
          <div className="p-8 max-w-xl mx-auto mt-20 bg-white rounded-2xl shadow-xl border border-red-200">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Algo salió mal</h2>
            <p className="text-gray-700 mb-4">{this.state.error?.message || 'Error desconocido'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Volver a intentar
            </button>
          </div>
        );
      }
      return this.props.children;
    }
  }
  
  // -------------------------------
  // 2. COMPONENTES BASE
  // -------------------------------
  const Button = ({
    variant = 'primary',
    children,
    className = '',
    disabled = false,
    ...props
  }) => {
    const base =
      'px-4 py-2 rounded-lg font-medium transition-all duration-200 inline-flex items-center justify-center gap-2';
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
      ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
      outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
      success: 'bg-green-600 text-white hover:bg-green-700',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    };
    const disabledClass = disabled ? 'opacity-40 cursor-not-allowed' : '';
    return (
      <button
        className={`${base} ${variants[variant] || variants.primary} ${disabledClass} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  };
  
  const Badge = ({ color = 'blue', children, className = '' }) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800',
      slate: 'bg-slate-100 text-slate-800',
      emerald: 'bg-emerald-100 text-emerald-800',
      amber: 'bg-amber-100 text-amber-800',
      rose: 'bg-rose-100 text-rose-800',
      gray: 'bg-gray-100 text-gray-800',
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${colors[color] || colors.gray} ${className}`}
      >
        {children}
      </span>
    );
  };
  
  const TypePill = ({ type, className = '' }) => {
    const map = {
      Educativo: { icon: '📚', color: 'blue' },
      Inspiracional: { icon: '💡', color: 'amber' },
      'Caso de éxito': { icon: '🏆', color: 'emerald' },
      Promocional: { icon: '📢', color: 'rose' },
      Personal: { icon: '👤', color: 'slate' },
    };
    const { icon, color } = map[type] || { icon: '📄', color: 'gray' };
    return (
      <Badge color={color} className={`${className} font-medium`}>
        {icon} {type}
      </Badge>
    );
  };
  
  const Card = ({ children, className = '', onClick, hover = false }) => {
    return (
      <div
        className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 ${
          hover ? 'hover:shadow-md transition-shadow cursor-pointer' : ''
        } ${className}`}
        onClick={onClick}
      >
        {children}
      </div>
    );
  };
  
  const Section = ({ icon, title, action, children }) => {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            {icon && <span>{icon}</span>}
            <span>{title}</span>
          </div>
          {action && <div>{action}</div>}
        </div>
        {children}
      </div>
    );
  };
  
  // -------------------------------
  // 3. CONSTANTES Y MOCKS DE IA
  // -------------------------------
  const CONTENT_TYPES = ['Educativo', 'Inspiracional', 'Caso de éxito', 'Promocional', 'Personal'];
  const FUNNEL_MAP = {
    Educativo: 'TOFU',
    Inspiracional: 'MOFU',
    'Caso de éxito': 'MOFU',
    Promocional: 'BOFU',
    Personal: 'TOFU',
  };
  const FORMATS = ['Artículo', 'Hilo', 'Carrusel', 'Video', 'Infografía'];
  
  // Perfil de onboarding (mock)
  const DEFAULT_PROFILE = {
    audience: 'Profesionales B2B de tecnología',
    problem: 'Generar leads calificados',
    goals: 'Posicionar marca como referente',
    tone: 'Profesional pero cercano',
  };
  
  // Pool de variantes (4 por tipo = 20)
  function buildVariantPool(profile = DEFAULT_PROFILE) {
    const { audience, problem, goals } = profile;
    // Datos mock con referencias al perfil
    const pools = {
      Educativo: [
        {
          id: 'edu-1',
          type: 'Educativo',
          funnel: 'TOFU',
          format: 'Artículo',
          idea: `Cómo ${audience} pueden resolver ${problem} con metodologías ágiles`,
          hook: '¿Sabías que el 80% de los leads se pierden por falta de seguimiento?',
          cta: 'Descarga nuestra guía gratuita',
          description: 'Artículo detallado sobre metodologías ágiles aplicadas a la generación de leads.',
          strategicObjective: 'Posicionar a la empresa como experta en metodologías.',
        },
        {
          id: 'edu-2',
          type: 'Educativo',
          funnel: 'TOFU',
          format: 'Hilo',
          idea: `5 pasos para que ${audience} dominen ${problem}`,
          hook: 'El error #1 que cometemos al intentar generar leads (y cómo evitarlo)',
          cta: 'Guarda este hilo para consultarlo después',
          description: 'Hilo de Twitter con pasos prácticos.',
          strategicObjective: 'Generar engagement y compartir conocimiento.',
        },
        {
          id: 'edu-3',
          type: 'Educativo',
          funnel: 'TOFU',
          format: 'Carrusel',
          idea: `El ABC de ${problem} para ${audience}`,
          hook: 'Deja de perder tiempo con estrategias que no funcionan.',
          cta: 'Comparte este carrusel con tu equipo',
          description: 'Carrusel de 10 diapositivas con conceptos clave.',
          strategicObjective: 'Educar al mercado y generar confianza.',
        },
        {
          id: 'edu-4',
          type: 'Educativo',
          funnel: 'TOFU',
          format: 'Video',
          idea: `Webinar: Cómo ${audience} pueden resolver ${problem} en 30 días`,
          hook: 'El método que usamos para multiplicar leads por 3',
          cta: 'Regístrate al webinar',
          description: 'Webinar en vivo con casos prácticos.',
          strategicObjective: 'Capturar leads calificados.',
        },
      ],
      Inspiracional: [
        {
          id: 'ins-1',
          type: 'Inspiracional',
          funnel: 'MOFU',
          format: 'Artículo',
          idea: `Historias de éxito de ${audience} que superaron ${problem}`,
          hook: 'Ellos lo lograron, tú también puedes',
          cta: 'Lee la historia completa',
          description: 'Artículo con testimonios y resultados.',
          strategicObjective: 'Inspirar y motivar a la audiencia.',
        },
        {
          id: 'ins-2',
          type: 'Inspiracional',
          funnel: 'MOFU',
          format: 'Hilo',
          idea: `Lecciones aprendidas al resolver ${problem}`,
          hook: 'Lo que nadie te cuenta sobre generar leads',
          cta: 'Comparte tu experiencia en los comentarios',
          description: 'Hilo con reflexiones personales.',
          strategicObjective: 'Fomentar la comunidad y el diálogo.',
        },
        {
          id: 'ins-3',
          type: 'Inspiracional',
          funnel: 'MOFU',
          format: 'Carrusel',
          idea: `10 frases que cambiarán tu perspectiva sobre ${problem}`,
          hook: 'La motivación es el motor de la acción',
          cta: 'Guarda este carrusel',
          description: 'Carrusel con frases inspiradoras.',
          strategicObjective: 'Crear conexión emocional.',
        },
        {
          id: 'ins-4',
          type: 'Inspiracional',
          funnel: 'MOFU',
          format: 'Video',
          idea: `Documental: El viaje de un emprendedor frente a ${problem}`,
          hook: 'La resiliencia es clave',
          cta: 'Mira el documental',
          description: 'Video documental con entrevistas.',
          strategicObjective: 'Humanizar la marca.',
        },
      ],
      'Caso de éxito': [
        {
          id: 'cas-1',
          type: 'Caso de éxito',
          funnel: 'MOFU',
          format: 'Artículo',
          idea: `Cómo ${audience} lograron resultados extraordinarios con ${problem}`,
          hook: 'De 0 a 100 en 6 meses: el caso de éxito que debes conocer',
          cta: 'Descarga el case study',
          description: 'Análisis detallado del caso.',
          strategicObjective: 'Demostrar eficacia con pruebas reales.',
        },
        {
          id: 'cas-2',
          type: 'Caso de éxito',
          funnel: 'MOFU',
          format: 'Hilo',
          idea: `El antes y después de ${audience} al solucionar ${problem}`,
          hook: 'Los números no mienten: así mejoraron sus conversiones',
          cta: 'Comparte este hilo',
          description: 'Hilo con datos y gráficos.',
          strategicObjective: 'Generar credibilidad.',
        },
        {
          id: 'cas-3',
          type: 'Caso de éxito',
          funnel: 'MOFU',
          format: 'Carrusel',
          idea: `Caso de éxito: ${audience} y su transformación`,
          hook: 'El secreto detrás de su éxito',
          cta: 'Guarda este carrusel',
          description: 'Carrusel con pasos y resultados.',
          strategicObjective: 'Mostrar el proceso.',
        },
        {
          id: 'cas-4',
          type: 'Caso de éxito',
          funnel: 'MOFU',
          format: 'Video',
          idea: `Entrevista a ${audience} sobre su éxito con ${problem}`,
          hook: 'Aprende de los mejores',
          cta: 'Mira la entrevista',
          description: 'Video entrevista con el cliente.',
          strategicObjective: 'Generar prueba social.',
        },
      ],
      Promocional: [
        {
          id: 'pro-1',
          type: 'Promocional',
          funnel: 'BOFU',
          format: 'Artículo',
          idea: `Nuestra solución definitiva para ${problem} de ${audience}`,
          hook: 'Deja de buscar, esto es lo que necesitas',
          cta: 'Solicita una demo',
          description: 'Artículo promocional con beneficios.',
          strategicObjective: 'Convertir leads en clientes.',
        },
        {
          id: 'pro-2',
          type: 'Promocional',
          funnel: 'BOFU',
          format: 'Hilo',
          idea: `7 razones por las que ${audience} confían en nosotros para ${problem}`,
          hook: 'La diferencia está en los detalles',
          cta: 'Conoce más',
          description: 'Hilo con argumentos de venta.',
          strategicObjective: 'Reforzar la decisión de compra.',
        },
        {
          id: 'pro-3',
          type: 'Promocional',
          funnel: 'BOFU',
          format: 'Carrusel',
          idea: `Oferta exclusiva para ${audience}`,
          hook: 'Aprovecha esta oportunidad única',
          cta: 'Reclama tu oferta',
          description: 'Carrusel con promoción y testimonio.',
          strategicObjective: 'Impulsar conversiones inmediatas.',
        },
        {
          id: 'pro-4',
          type: 'Promocional',
          funnel: 'BOFU',
          format: 'Video',
          idea: `Demo de nuestra solución para ${problem}`,
          hook: 'Mira cómo funciona en la práctica',
          cta: 'Agenda tu demo',
          description: 'Video demostrativo con casos de uso.',
          strategicObjective: 'Mostrar el producto en acción.',
        },
      ],
      Personal: [
        {
          id: 'per-1',
          type: 'Personal',
          funnel: 'TOFU',
          format: 'Artículo',
          idea: `Mi viaje personal con ${problem} y cómo lo superé`,
          hook: 'Lo que aprendí en el camino',
          cta: 'Comparte tu historia',
          description: 'Artículo autobiográfico.',
          strategicObjective: 'Humanizar y conectar a nivel personal.',
        },
        {
          id: 'per-2',
          type: 'Personal',
          funnel: 'TOFU',
          format: 'Hilo',
          idea: `Días difíciles, lecciones valiosas sobre ${problem}`,
          hook: 'La vulnerabilidad es una fortaleza',
          cta: 'Comenta tu experiencia',
          description: 'Hilo con anécdotas personales.',
          strategicObjective: 'Generar empatía y confianza.',
        },
        {
          id: 'per-3',
          type: 'Personal',
          funnel: 'TOFU',
          format: 'Carrusel',
          idea: `Mi rutina diaria para enfrentar ${problem}`,
          hook: 'Los hábitos que cambiaron mi vida',
          cta: 'Guarda este carrusel',
          description: 'Carrusel con consejos personales.',
          strategicObjective: 'Mostrar autenticidad.',
        },
        {
          id: 'per-4',
          type: 'Personal',
          funnel: 'TOFU',
          format: 'Video',
          idea: `Vlog: Un día en mi vida resolviendo ${problem}`,
          hook: 'Detrás de cámaras',
          cta: 'Suscríbete para más',
          description: 'Video vlog con momentos cotidianos.',
          strategicObjective: 'Crear una comunidad alrededor de la marca personal.',
        },
      ],
    };
    return pools;
  }
  
  // Funciones IA mock
  async function generateContentIdeas(profile = DEFAULT_PROFILE) {
    // TODO: conectar API real (OpenAI / Claude / Gemini)
    const pool = buildVariantPool(profile);
    // Elegir una idea aleatoria de cada tipo
    const ideas = CONTENT_TYPES.map((type) => {
      const variants = pool[type];
      const idx = Math.floor(Math.random() * variants.length);
      return { ...variants[idx], approved: false, discarded: false };
    });
    return ideas;
  }
  
  async function regenerateIdea(profile, currentIdea) {
    // TODO: conectar API real
    const pool = buildVariantPool(profile);
    const variants = pool[currentIdea.type];
    // Filtrar la variante actual
    const others = variants.filter((v) => v.id !== currentIdea.id);
    if (others.length === 0) return currentIdea; // fallback
    const idx = Math.floor(Math.random() * others.length);
    const newIdea = { ...others[idx], approved: false, discarded: false };
    // Preservar id original (para no remontar)
    newIdea.id = currentIdea.id;
    return newIdea;
  }
  
  async function generateCalendar(approvedIdeas, frequency = 'diario') {
    // TODO: conectar API real
    // Simula distribución en fechas
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1); // lunes de esta semana
    const days = [];
    if (frequency === 'diario') {
      // L-D
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
      }
    } else if (frequency === '5/semana') {
      // L-V
      for (let i = 0; i < 5; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
      }
    } else if (frequency === '3/semana') {
      // L-X-V
      [0, 2, 4].forEach((offset) => {
        const d = new Date(start);
        d.setDate(start.getDate() + offset);
        days.push(d);
      });
    } else if (frequency === 'mensual') {
      // 4 semanas L-V (20 días laborables)
      for (let week = 0; week < 4; week++) {
        for (let day = 0; day < 5; day++) {
          const d = new Date(start);
          d.setDate(start.getDate() + week * 7 + day);
          days.push(d);
        }
      }
    }
    // Asignar ideas a días (rotando)
    const calendar = [];
    const numIdeas = approvedIdeas.length;
    if (numIdeas === 0) return [];
    days.forEach((date, index) => {
      const ideaIdx = index % numIdeas;
      calendar.push({
        date,
        idea: approvedIdeas[ideaIdx],
      });
    });
    return calendar;
  }
  
  async function generatePostDetail(idea) {
    // TODO: conectar API real
    return {
      id: idea.id,
      type: idea.type,
      date: new Date().toISOString().split('T')[0],
      strategicObjective: idea.strategicObjective,
      hooks: [
        { variant: 'directo', text: idea.hook },
        { variant: 'curioso', text: `¿Alguna vez te preguntaste cómo ${idea.hook.toLowerCase()}?` },
        { variant: 'polarizador', text: `La mayoría cree que ${idea.hook.split(' ').slice(0,3).join(' ')}... y se equivoca.` },
      ],
      body: {
        apertura: `Abrimos con una reflexión sobre ${idea.type.toLowerCase()}.`,
        problema: `El problema principal es ${idea.problem || 'la falta de resultados'}.`,
        insight: `Descubrimos que la clave está en ${idea.idea.split(' ').slice(0,2).join(' ')}.`,
        desarrollo: `Desarrollamos el concepto con ejemplos prácticos.`,
        ejemplo: `Por ejemplo, ${idea.audience || 'nuestros clientes'} han logrado mejoras del 30%.`,
        cierre: `En resumen, ${idea.cta}.`,
      },
      ctaVariants: [
        { variant: 'suave', text: 'Me gustaría saber tu opinión, ¿qué piensas?', icon: '💬' },
        { variant: 'comentario', text: 'Deja un comentario con tu experiencia', icon: '✍️' },
        { variant: 'DM', text: 'Escríbeme por DM para más información', icon: '📩' },
      ],
      creative: {
        type: idea.format,
        description: `Un ${idea.format} que transmite ${idea.type.toLowerCase()}.`,
        mainText: idea.idea,
        imagePrompt: `Imagen que represente "${idea.idea}" en un entorno profesional.`,
        structure: idea.format === 'Carrusel' ? '10 diapositivas' : 'Video de 2 minutos',
      },
    };
  }
  
  async function regenerateHook(postDetail, variant) {
    // TODO: conectar API real
    const newText = `Nuevo hook para ${variant}: ¿Sabías que ${Math.floor(Math.random()*100)}% de los profesionales ...?`;
    const newHooks = postDetail.hooks.map((h) =>
      h.variant === variant ? { ...h, text: newText } : h
    );
    return { ...postDetail, hooks: newHooks };
  }
  
  async function regenerateCTA(postDetail, type) {
    // TODO: conectar API real
    const newText = `CTA regenerado para ${type}: "Descubre más ahora"`;
    const newCTAs = postDetail.ctaVariants.map((c) =>
      c.variant === type ? { ...c, text: newText } : c
    );
    return { ...postDetail, ctaVariants: newCTAs };
  }
  
  async function regenerateCreative(postDetail) {
    // TODO: conectar API real
    const newPrompt = `Prompt regenerado: "${postDetail.creative.imagePrompt} (versión mejorada)"`;
    return {
      ...postDetail,
      creative: { ...postDetail.creative, imagePrompt: newPrompt },
    };
  }
  
  // -------------------------------
  // 4. COMPONENTES DE VISTA
  // -------------------------------
  // 4a. IdeaCard
  const IdeaCard = ({ idea, onApprove, onRegenerate, onEdit, onDiscard }) => {
    return (
      <Card className="mb-4">
        <div className="flex justify-between items-start">
          <div>
            <TypePill type={idea.type} />
            <div className="flex gap-2 mt-1">
              <Badge color="slate">{idea.funnel}</Badge>
              <Badge color="gray">{idea.format}</Badge>
            </div>
            <h3 className="text-lg font-bold mt-2">{idea.idea}</h3>
            <p className="italic text-gray-600">{idea.hook}</p>
            <p className="mt-2 text-sm text-gray-700">
              <strong>CTA:</strong> {idea.cta}
            </p>
            <p className="mt-1 text-sm text-gray-600">{idea.description}</p>
            <p className="mt-1 text-xs text-gray-500">
              <strong>Objetivo:</strong> {idea.strategicObjective}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button variant="success" onClick={() => onApprove(idea.id)}>
            Aprobar
          </Button>
          <Button variant="secondary" onClick={() => onRegenerate(idea.id)}>
            Regenerar
          </Button>
          <Button variant="outline" onClick={() => onEdit(idea.id)}>
            Editar
          </Button>
          <Button variant="danger" onClick={() => onDiscard(idea.id)}>
            Descartar
          </Button>
        </div>
      </Card>
    );
  };
  
  // 4b. IdeasView
  const IdeasView = ({ ideas, onApprove, onRegenerate, onEdit, onDiscard }) => {
    return (
      <div className="space-y-4">
        {ideas.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            onApprove={onApprove}
            onRegenerate={onRegenerate}
            onEdit={onEdit}
            onDiscard={onDiscard}
          />
        ))}
      </div>
    );
  };
  
  // 4c. CalendarView
  const CalendarView = ({
    approvedIdeas,
    frequency = 'diario',
    onSelectPost,
  }) => {
    const [view, setView] = useState('semana'); // 'semana' | 'mes'
    const [currentDate, setCurrentDate] = useState(new Date());
  
    // Cálculo de inicio de semana (lunes) - CRÍTICO: evitar toISOString y usar lógica correcta
    const getWeekStart = useCallback((date) => {
      const d = new Date(date);
      const day = d.getDay(); // 0 domingo, 1 lunes...
      const diff = day === 0 ? -6 : 1 - day; // si domingo, retrocedemos 6 días; sino a lunes
      d.setDate(d.getDate() + diff);
      return d;
    }, []);
  
    // Fechas de la semana actual
    const weekDates = useMemo(() => {
      const start = getWeekStart(currentDate);
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(d);
      }
      return dates;
    }, [currentDate, getWeekStart]);
  
    // Calendario mensual: días del mes actual
    const monthDates = useMemo(() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startWeekday = firstDay.getDay(); // 0 domingo
      const days = [];
      // Rellenar días vacíos al inicio
      for (let i = 0; i < startWeekday; i++) {
        days.push(null);
      }
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
      }
      return days;
    }, [currentDate]);
  
    // Generar calendario con ideas aprobadas
    const calendarData = useMemo(() => {
      if (approvedIdeas.length === 0) return [];
      // Simular asignación según frecuencia
      const start = getWeekStart(currentDate);
      const days = [];
      if (frequency === 'diario') {
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          days.push(d);
        }
      } else if (frequency === '5/semana') {
        for (let i = 0; i < 5; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          days.push(d);
        }
      } else if (frequency === '3/semana') {
        [0, 2, 4].forEach((offset) => {
          const d = new Date(start);
          d.setDate(start.getDate() + offset);
          days.push(d);
        });
      } else if (frequency === 'mensual') {
        // 4 semanas L-V
        for (let week = 0; week < 4; week++) {
          for (let day = 0; day < 5; day++) {
            const d = new Date(start);
            d.setDate(start.getDate() + week * 7 + day);
            days.push(d);
          }
        }
      }
      // Rotar ideas
      const result = days.map((date, idx) => ({
        date,
        idea: approvedIdeas[idx % approvedIdeas.length],
      }));
      return result;
    }, [approvedIdeas, frequency, currentDate, getWeekStart]);
  
    // Navegación
    const goToPrevious = () => {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    };
    const goToNext = () => {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    };
    const goToToday = () => {
      setCurrentDate(new Date());
    };
  
    // Formato de fecha local (yyyy-mm-dd manual)
    const formatLocalDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
  
    // Render de día en semana
    const renderWeekDay = (date) => {
      const dayStr = formatLocalDate(date);
      const post = calendarData.find((p) => formatLocalDate(p.date) === dayStr);
      return (
        <div key={dayStr} className="border p-2 min-h-[100px] bg-white rounded">
          <div className="text-sm font-bold">{date.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
          <div className="text-xs text-gray-500">{date.getDate()}</div>
          {post && (
            <div
              className="mt-1 p-1 bg-blue-50 rounded text-xs cursor-pointer hover:bg-blue-100"
              onClick={() => onSelectPost(post.idea)}
            >
              <TypePill type={post.idea.type} className="text-xs" />
              <div className="truncate">{post.idea.idea}</div>
            </div>
          )}
        </div>
      );
    };
  
    // Render de día en mes
    const renderMonthDay = (date) => {
      if (!date) return <div className="border p-1 bg-gray-50"></div>;
      const dayStr = formatLocalDate(date);
      const posts = calendarData.filter((p) => formatLocalDate(p.date) === dayStr);
      return (
        <div key={dayStr} className="border p-1 min-h-[60px] bg-white">
          <div className="text-xs font-bold">{date.getDate()}</div>
          {posts.slice(0, 2).map((p, idx) => (
            <div
              key={idx}
              className="text-[10px] truncate cursor-pointer hover:bg-blue-50 rounded px-1"
              onClick={() => onSelectPost(p.idea)}
            >
              <TypePill type={p.idea.type} className="text-[8px]" />
            </div>
          ))}
          {posts.length > 2 && (
            <div className="text-[10px] text-gray-500">+{posts.length - 2} más</div>
          )}
        </div>
      );
    };
  
    // IMPORTANTE: useMemo ya está antes de cualquier return condicional
    // Ahora los returns condicionales (loading, vacío) se hacen después de todos los hooks
    if (approvedIdeas.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500">
          No hay ideas aprobadas para mostrar en el calendario.
        </div>
      );
    }
  
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button
              variant={view === 'semana' ? 'primary' : 'outline'}
              onClick={() => setView('semana')}
            >
              Semana
            </Button>
            <Button
              variant={view === 'mes' ? 'primary' : 'outline'}
              onClick={() => setView('mes')}
            >
              Mes
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={goToPrevious}>Anterior</Button>
            <Button variant="outline" onClick={goToToday}>Hoy</Button>
            <Button variant="outline" onClick={goToNext}>Siguiente</Button>
          </div>
        </div>
  
        {view === 'semana' && (
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date) => renderWeekDay(date))}
          </div>
        )}
  
        {view === 'mes' && (
          <div className="grid grid-cols-7 gap-1">
            {monthDates.map((date) => renderMonthDay(date))}
          </div>
        )}
      </div>
    );
  };
  
  // 4d. DashboardView
  const DashboardView = ({ ideas }) => {
    // Calcular distribuciones
    const total = ideas.filter((i) => i.approved).length;
    const typeCounts = {};
    const funnelCounts = { TOFU: 0, MOFU: 0, BOFU: 0 };
    const typeDistribution = {};
    const funnelDistribution = {};
  
    ideas.forEach((idea) => {
      if (!idea.approved) return;
      const type = idea.type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      const funnel = FUNNEL_MAP[type] || 'TOFU';
      funnelCounts[funnel] = (funnelCounts[funnel] || 0) + 1;
    });
  
    CONTENT_TYPES.forEach((type) => {
      typeDistribution[type] = total > 0 ? (typeCounts[type] || 0) / total : 0;
    });
    Object.keys(funnelCounts).forEach((f) => {
      funnelDistribution[f] = total > 0 ? funnelCounts[f] / total : 0;
    });
  
    // KPI
    const venta = typeCounts['Promocional'] || 0;
    const autoridad = (typeCounts['Educativo'] || 0) + (typeCounts['Caso de éxito'] || 0);
    const personal = typeCounts['Personal'] || 0;
    const kpis = [
      { label: 'Posts totales', value: total },
      { label: 'Posts de venta', value: venta },
      { label: 'Posts de autoridad', value: autoridad },
      { label: 'Posts personales', value: personal },
    ];
  
    // Avisos inteligentes
    const avisos = [];
    if (venta / total > 0.3) avisos.push('⚠️ Hay demasiados posts de venta (>30%)');
    if (personal / total < 0.08 && total > 0) avisos.push('⚠️ Falta contenido personal (<8%)');
    if (typeDistribution['Educativo'] > 0.4 && typeDistribution['Caso de éxito'] < 0.15) {
      avisos.push('⚠️ Mucho educativo, poca prueba (casos de éxito)');
    }
    if (funnelDistribution['TOFU'] > 0.4 && funnelDistribution['BOFU'] >= 0 && funnelDistribution['BOFU'] <= 0.15) {
      avisos.push('✅ Buen equilibrio entre alcance y conversión');
    }
    if (avisos.length === 0) avisos.push('✅ Mix equilibrado');
  
    return (
      <div>
        <Section icon="📊" title="Dashboard de equilibrio">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <h4 className="font-semibold mb-2">Distribución por tipo</h4>
              {CONTENT_TYPES.map((type) => (
                <div key={type} className="mb-2">
                  <div className="flex justify-between text-sm">
                    <span>{type}</span>
                    <span>{Math.round((typeDistribution[type] || 0) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(typeDistribution[type] || 0) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <h4 className="font-semibold mb-2">Distribución por funnel</h4>
              {Object.keys(funnelDistribution).map((f) => (
                <div key={f} className="mb-2">
                  <div className="flex justify-between text-sm">
                    <span>{f}</span>
                    <span>{Math.round((funnelDistribution[f] || 0) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${(funnelDistribution[f] || 0) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
  
          <div className="grid grid-cols-4 gap-4 mb-6">
            {kpis.map((kpi) => (
              <Card key={kpi.label}>
                <div className="text-sm text-gray-500">{kpi.label}</div>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </Card>
            ))}
          </div>
  
          <Card>
            <h4 className="font-semibold mb-2">Avisos inteligentes</h4>
            <ul className="space-y-1">
              {avisos.map((aviso, idx) => (
                <li key={idx} className="text-sm">{aviso}</li>
              ))}
            </ul>
          </Card>
        </Section>
      </div>
    );
  };
  
  // 4e. PostDetailDrawer
  const PostDetailDrawer = ({ post, onClose, onApprove, onRegenerateHook, onRegenerateCTA, onRegenerateCreative }) => {
    const [activeHookTab, setActiveHookTab] = useState('directo');
    const [activeCTATab, setActiveCTATab] = useState('suave');
  
    if (!post) return null;
  
    const selectedHook = post.hooks?.find((h) => h.variant === activeHookTab) || post.hooks?.[0];
    const selectedCTA = post.ctaVariants?.find((c) => c.variant === activeCTATab) || post.ctaVariants?.[0];
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end">
        <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl p-6">
          {/* Header sticky */}
          <div className="sticky top-0 bg-white z-10 pb-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TypePill type={post.type} />
              <span className="text-sm text-gray-500">{post.date}</span>
            </div>
            <Button variant="ghost" onClick={onClose}>✕ Cerrar</Button>
          </div>
  
          <div className="mt-4 space-y-6">
            {/* Objetivo estratégico */}
            <Section icon="🎯" title="Objetivo estratégico">
              <p>{post.strategicObjective}</p>
            </Section>
  
            {/* Hook con tabs */}
            <Section
              icon="🎣"
              title="Hook"
              action={
                <Button variant="outline" size="sm" onClick={() => onRegenerateHook(post.id, activeHookTab)}>
                  Regenerar
                </Button>
              }
            >
              <div className="flex gap-2 mb-2">
                {post.hooks?.map((h) => (
                  <Button
                    key={h.variant}
                    variant={activeHookTab === h.variant ? 'primary' : 'outline'}
                    onClick={() => setActiveHookTab(h.variant)}
                    size="sm"
                  >
                    {h.variant}
                  </Button>
                ))}
              </div>
              <p className="italic">{selectedHook?.text}</p>
            </Section>
  
            {/* Cuerpo del post */}
            <Section icon="📝" title="Cuerpo del post">
              <div className="space-y-2 text-sm">
                <p><strong>Apertura:</strong> {post.body?.apertura}</p>
                <p><strong>Problema:</strong> {post.body?.problema}</p>
                <p><strong>Insight:</strong> {post.body?.insight}</p>
                <p><strong>Desarrollo:</strong> {post.body?.desarrollo}</p>
                <p><strong>Ejemplo:</strong> {post.body?.ejemplo}</p>
                <p><strong>Cierre:</strong> {post.body?.cierre}</p>
              </div>
            </Section>
  
            {/* CTA con tabs */}
            <Section
              icon="📢"
              title="CTA"
              action={
                <Button variant="outline" size="sm" onClick={() => onRegenerateCTA(post.id, activeCTATab)}>
                  Regenerar
                </Button>
              }
            >
              <div className="flex gap-2 mb-2">
                {post.ctaVariants?.map((c) => (
                  <Button
                    key={c.variant}
                    variant={activeCTATab === c.variant ? 'primary' : 'outline'}
                    onClick={() => setActiveCTATab(c.variant)}
                    size="sm"
                  >
                    {c.icon} {c.variant}
                  </Button>
                ))}
              </div>
              <p>{selectedCTA?.text}</p>
            </Section>
  
            {/* Creativo recomendado */}
            <Section
              icon="🎨"
              title="Creativo recomendado"
              action={
                <Button variant="outline" size="sm" onClick={() => onRegenerateCreative(post.id)}>
                  Regenerar
                </Button>
              }
            >
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p><strong>Tipo:</strong> {post.creative?.type}</p>
                <p><strong>Descripción:</strong> {post.creative?.description}</p>
                <p><strong>Texto principal:</strong> {post.creative?.mainText}</p>
                <div className="bg-gray-800 text-white p-3 rounded">
                  <p className="text-xs">Prompt para imagen:</p>
                  <p className="text-sm">{post.creative?.imagePrompt}</p>
                </div>
                <p><strong>Estructura:</strong> {post.creative?.structure}</p>
              </div>
            </Section>
          </div>
  
          {/* Footer */}
          <div className="sticky bottom-0 bg-white pt-4 border-t flex gap-2">
            <Button variant="success" onClick={() => onApprove(post.id)}>Aprobar post</Button>
            <Button variant="secondary">Marcar pendiente</Button>
            <Button variant="outline">Editar</Button>
          </div>
        </div>
      </div>
    );
  };
  
  // -------------------------------
  // 5. LAYOUT: SIDEBAR, HEADER, APP
  // -------------------------------
  const Sidebar = ({ currentView, setCurrentView, ideas }) => {
    const approvedCount = ideas.filter((i) => i.approved).length;
    const total = ideas.length;
    const progress = total > 0 ? `${approvedCount}/${total}` : '0/0';
  
    const navItems = [
      { id: 'ideas', label: 'Ideas', icon: '💡' },
      { id: 'calendar', label: 'Calendario', icon: '📅' },
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    ];
  
    return (
      <aside className="w-64 sticky top-0 h-screen bg-white border-r border-gray-200 p-4 hidden md:block">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0A66C2] rounded flex items-center justify-center text-white font-bold">in</div>
            <span className="font-semibold text-lg">LinkedIn Content OS</span>
          </div>
          <div className="text-xs text-gray-500">Sistema de contenido B2B</div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#E8F3FF] text-[#0A66C2]'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setCurrentView(item.id)}
              >
                <span>{item.icon}</span>
                {item.label}
                {item.id === 'ideas' && (
                  <Badge color={approvedCount === total ? 'emerald' : 'blue'} className="ml-auto">
                    {progress}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
        <div className="mt-8 p-4 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl text-white">
          <p className="text-sm font-semibold">Pro Tip</p>
          <p className="text-xs mt-1">Aprovecha el calendario para planificar tu estrategia de contenido.</p>
        </div>
      </aside>
    );
  };
  
  const Header = ({ ideas, onGenerateCalendar, canGenerate }) => {
    const approvedCount = ideas.filter((i) => i.approved).length;
    const total = ideas.length;
    let message = 'Aprueba al menos una idea para generar el calendario.';
    if (approvedCount > 0 && approvedCount < total) {
      message = `${approvedCount} listas, puedes generar ya.`;
    } else if (approvedCount === total && total > 0) {
      message = 'Todas aprobadas. ¡A construir!';
    }
  
    return (
      <header className="sticky top-0 bg-white/80 backdrop-blur border-b border-gray-200 px-6 py-3 flex items-center justify-between z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-6 h-6 bg-[#0A66C2] rounded flex items-center justify-center text-white text-xs font-bold">in</div>
            <span className="font-semibold">LinkedIn Content OS</span>
          </div>
          <Badge color="emerald" className="hidden md:inline-flex">Sistema activo</Badge>
          <Button variant="outline" size="sm">IA conectada</Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600 hidden sm:block">{message}</div>
          <div className="flex items-center gap-2">
            <Badge color="blue">{approvedCount}/{total} aprobadas</Badge>
            <Button
              variant="primary"
              onClick={onGenerateCalendar}
              disabled={!canGenerate}
            >
              Generar calendario
            </Button>
          </div>
        </div>
      </header>
    );
  };
  
  // -------------------------------
  // 6. APP PRINCIPAL
  // -------------------------------
  const AppInner = () => {
    // Estado global
    const [profile] = useState(DEFAULT_PROFILE);
    const [ideas, setIdeas] = useState([]);
    const [currentView, setCurrentView] = useState('ideas');
    const [selectedPost, setSelectedPost] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [frequency, setFrequency] = useState('diario');
  
    // Cargar ideas iniciales
    useEffect(() => {
      const loadIdeas = async () => {
        const initial = await generateContentIdeas(profile);
        setIdeas(initial);
      };
      loadIdeas();
    }, [profile]);
  
    // Handlers
    const handleApprove = (id) => {
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === id ? { ...idea, approved: !idea.approved } : idea
        )
      );
    };
  
    const handleRegenerate = async (id) => {
      const current = ideas.find((i) => i.id === id);
      if (!current) return;
      const newIdea = await regenerateIdea(profile, current);
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === id ? newIdea : idea))
      );
    };
  
    const handleEdit = (id) => {
      // Simular edición abriendo el drawer con el detalle del post (si está aprobado)
      const idea = ideas.find((i) => i.id === id);
      if (idea && idea.approved) {
        generatePostDetail(idea).then((detail) => {
          setSelectedPost({ ...detail, id: idea.id });
          setIsDrawerOpen(true);
        });
      } else {
        alert('Solo se pueden editar ideas aprobadas.');
      }
    };
  
    const handleDiscard = (id) => {
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === id ? { ...idea, discarded: !idea.discarded } : idea
        )
      );
    };
  
    const handleGenerateCalendar = () => {
      const approved = ideas.filter((i) => i.approved);
      if (approved.length === 0) return;
      setCurrentView('calendar');
    };
  
    const handleSelectPost = (idea) => {
      generatePostDetail(idea).then((detail) => {
        setSelectedPost({ ...detail, id: idea.id });
        setIsDrawerOpen(true);
      });
    };
  
    const handleCloseDrawer = () => {
      setIsDrawerOpen(false);
      setSelectedPost(null);
    };
  
    const handleApprovePost = (id) => {
      // Ya aprobado desde la card, aquí solo cerramos
      setIsDrawerOpen(false);
      setSelectedPost(null);
    };
  
    const handleRegenerateHook = async (id, variant) => {
      if (selectedPost) {
        const updated = await regenerateHook(selectedPost, variant);
        setSelectedPost(updated);
      }
    };
  
    const handleRegenerateCTA = async (id, type) => {
      if (selectedPost) {
        const updated = await regenerateCTA(selectedPost, type);
        setSelectedPost(updated);
      }
    };
  
    const handleRegenerateCreative = async (id) => {
      if (selectedPost) {
        const updated = await regenerateCreative(selectedPost);
        setSelectedPost(updated);
      }
    };
  
    // Calcular si se puede generar calendario
    const canGenerate = ideas.some((i) => i.approved);
  
    // Filtrar ideas no descartadas
    const activeIdeas = ideas.filter((i) => !i.discarded);
  
    // Render de contenido según vista
    const renderContent = () => {
      switch (currentView) {
        case 'ideas':
          return (
            <IdeasView
              ideas={activeIdeas}
              onApprove={handleApprove}
              onRegenerate={handleRegenerate}
              onEdit={handleEdit}
              onDiscard={handleDiscard}
            />
          );
        case 'calendar':
          return (
            <CalendarView
              approvedIdeas={ideas.filter((i) => i.approved)}
              frequency={frequency}
              onSelectPost={handleSelectPost}
            />
          );
        case 'dashboard':
          return <DashboardView ideas={ideas} />;
        default:
          return <div>Vista no encontrada</div>;
      }
    };
  
    return (
      <div className="flex">
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          ideas={ideas}
        />
        <div className="flex-1 min-h-screen">
          <Header
            ideas={ideas}
            onGenerateCalendar={handleGenerateCalendar}
            canGenerate={canGenerate}
          />
          <main className="p-6 max-w-4xl mx-auto">
            {renderContent()}
          </main>
        </div>
        {isDrawerOpen && selectedPost && (
          <PostDetailDrawer
            post={selectedPost}
            onClose={handleCloseDrawer}
            onApprove={handleApprovePost}
            onRegenerateHook={handleRegenerateHook}
            onRegenerateCTA={handleRegenerateCTA}
            onRegenerateCreative={handleRegenerateCreative}
          />
        )}
      </div>
    );
  };
  
  // Aplicación envuelta en ErrorBoundary
  export default function App() {
    return (
      <ErrorBoundary>
        <AppInner />
      </ErrorBoundary>
    );
  }