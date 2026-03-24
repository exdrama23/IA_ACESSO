export interface FAQItem {
  category: string;
  questions: string[];
  answer: string;
  keywords: string[];
}

export const faq: Record<string, FAQItem[]> = {
  internet_fibra: [
    {
      category: "Internet Fibra",
      questions: [
        "Quais são os planos de internet fibra?",
        "Quanto custa a internet de fibra?",
        "Qual o valor da internet para casa?",
        "Quais as velocidades de fibra que vocês têm?",
        "Preços da internet fixa",
        "Qual o valor do serviços da empresa?",
        "Quanto custa os serviços da Acesso?",
        "Quais os valores da Acesso?",
        "Qual o preço da internet Acesso?",
        "Valores dos planos da empresa",
        "Tabela de preços da Acesso",
        "Quanto custa para colocar internet?",
        "Qual o valor da mensalidade?",
        "Quanto é a Acesso?",
        "Preço da Acesso",
        "Me fala os preços dos planos",
        "Quais pacotes de internet vocês oferecem?",
        "Quero saber o valor da instalação e mensalidade",
        "Quais as opções de megas disponíveis?",
        "Tabela de valores da internet",
        "explique",
        "não entendi",
        "como assim",
        "pode explicar melhor?",
        "repete isso",
        "explica melhor os planos",
        "como funcionam esses planos?",
        "quais as opções de internet?"
      ],
      answer: "Temos planos de internet fibra com 50 Mega por R$ 79,90, 150 Mega por R$ 99,90, 300 Mega por R$ 119,90 e 600 Mega por R$ 129,90 por mês. Quanto maior a velocidade, melhor para casas com mais pessoas, jogos e streaming.",
      keywords: ["fibra", "internet", "velocidade", "mega", "preço", "mensalidade", "acesso", "valor", "serviço", "explicar", "entendi"]
    },
    {
      category: "Internet Fibra",
      questions: [
        "Tem plano para professor?",
        "Qual o valor da internet de professor?",
        "Existe desconto para quem é professor?",
        "Plano Fibra Professor",
        "Professor paga quanto na internet?",
        "Sou professor, tenho algum benefício?",
        "Qual a promoção para educadores?",
        "Tem internet mais barata para quem dá aula?"
      ],
      answer: "Sim! Temos o plano Fibra Professor de 200 Mega por um valor exclusivo de R$ 90,00.",
      keywords: ["professor", "educação", "200 mega", "desconto", "especial"]
    },
    {
      category: "Internet Fibra",
      questions: [
        "O que vem nos planos de fibra?",
        "Tem algum benefício extra na internet?",
        "O que é Skeelo?",
        "Quais os apps inclusos no plano?",
        "Tem algum brinde ou serviço adicional?",
        "O que eu ganho assinando a fibra?",
        "Além da internet, o que mais vem?"
      ],
      answer: "Todos os nossos planos de fibra já incluem o Skeelo para você aproveitar diversos livros digitais sem custo adicional.",
      keywords: ["skeelo", "benefício", "livros", "extra", "bônus"]
    }
  ],
  acesso_saude: [
    {
      category: "Acesso Saúde",
      questions: [
        "Quais são os planos de saúde?",
        "Como funciona o Acesso Saúde?",
        "Quais as coberturas do Acesso Saúde?",
        "Vocês têm convênio médico?",
        "Valores do Acesso Saúde",
        "Diferença entre os planos de saúde",
        "Me explica sobre o plano médico",
        "Quanto custa o plano de saúde da Acesso?",
        "É tipo um plano de saúde?",
        "Como faço para ter assistência médica?"
      ],
      answer: "Oferecemos planos de Clínica Médica e Telemedicina. Na Clínica Médica, você tem consultas presenciais com valores acessíveis. Já na Telemedicina, você pode falar com médico online. Os planos começam a partir de R$ 19,90 e variam conforme o tipo de atendimento escolhido.",
      keywords: ["saúde", "médico", "clínica", "telemedicina", "consulta", "família", "cobertura"]
    },
    {
      category: "Acesso Saúde",
      questions: [
        "Como funciona o plano família?",
        "Quantas consultas tem o plano família?",
        "Como é o plano de saúde para família?",
        "Quanto custa a Clínica Médica Família?",
        "Plano de saúde familiar valor",
        "Como funciona o Acesso Saúde para meus filhos?",
        "Tem desconto para família no plano médico?",
        "Quantas pessoas podem usar o plano família?"
      ],
      answer: "O plano Família custa R$ 59,90 por mês e oferece consultas ilimitadas com Clínico Geral e Pediatra, além de 5 consultas mensais com especialistas para toda a família.",
      keywords: ["família", "especialidades", "ilimitado", "pediatra", "clínico"]
    },
    {
      category: "Acesso Saúde",
      questions: [
        "Como agendar consulta por vídeo?",
        "Como funciona a consulta online?",
        "O que é a Telemedicina da Acesso?",
        "Quanto custa a telemedicina individual?",
        "Posso falar com médico pelo celular?",
        "Atendimento médico à distância",
        "Valor da consulta virtual",
        "Como funciona o agendamento pelo aplicativo?",
        "Onde encontro a opção de telemedicina no app?",
        "Dá para marcar consulta online pelo celular?",
        "Como escolher o horário da consulta no app?",
        "Preciso ligar para agendar a vídeo consulta?",
        "Como usar o app Acesso Net Fibra para falar com médico?",
        "O agendamento de telemedicina é feito por onde?",
        "Tem como marcar médico sem sair de casa?",
        "Consigo ajuda para agendar minha consulta por vídeo?"
      ],
      answer: "Você pode agendar sua consulta por vídeo diretamente pelo aplicativo Acesso Net Fibra. Basta acessar a opção de telemedicina e escolher o melhor horário disponível entre as opções do sistema.",
      keywords: ["agendar", "vídeo", "aplicativo", "app", "telemedicina", "horário", "celular", "online"]
    },
    {
      category: "Acesso Saúde",
      questions: [
        "Quais as vantagens do atendimento médico?",
        "Tem limite de consultas no Acesso Saúde?",
        "Quantas vezes posso ir ao clínico geral?",
        "Como funciona o agendamento de pediatra?",
        "Posso passar por especialista quantas vezes?",
        "O atendimento médico é imediato?",
        "Preciso esperar muito para ser atendido?",
        "Quais médicos estão disponíveis agora?",
        "Como faço para marcar uma consulta de especialidade?",
        "O clínico geral é ilimitado mesmo?"
      ],
      answer: "O plano oferece consultas ilimitadas com Clínico Geral e Pediatra, além de 5 consultas por mês com especialistas. O atendimento é realizado após a ligação do cliente.",
      keywords: ["consultas", "ilimitado", "especialidades", "clínico", "pediatra", "agora", "na hora", "médico"]
    }
  ],
  movel_e_fixo: [
    {
      category: "Celular e Telefone",
      questions: [
        "Vocês têm plano de celular?",
        "Quanto custa o chip da Acesso?",
        "O que é o Baratinho 15GB?",
        "Tem plano com WhatsApp ilimitado?",
        "Qual o valor do plano móvel?",
        "Como funciona o chip da Acesso?",
        "Quais os planos para celular?",
        "Tem internet móvel?",
        "Qual o preço do plano de 15 giga?",
        "O chip tem sinal bom?"
      ],
      answer: "Temos o plano Baratinho 15GB por R$ 39,90 mensais. Ele inclui chip, internet de 15GB, além de ligações e WhatsApp ilimitados.",
      keywords: ["celular", "móvel", "chip", "15gb", "baratinho", "whatsapp", "ligação"]
    },
    {
      category: "Celular e Telefone",
      questions: [
        "Vocês têm telefone fixo?",
        "Qual o valor da telefonia fixa?",
        "Telefone fixo ilimitado",
        "Quanto custa instalar um fixo?",
        "Tem plano de voz para casa?",
        "Como ter um telefone fixo da Acesso?",
        "Telefone fixo residencial valor"
      ],
      answer: "A telefonia fixa possui chamadas ilimitadas pelo valor de R$ 69,90 por mês.",
      keywords: ["fixo", "telefone", "ligação", "ilimitado"]
    }
  ],
  servicos_adicionais: [
    {
      category: "Serviços Extras",
      questions: [
        "Vocês vendem Globoplay?",
        "Quanto custa o Globoplay na Acesso?",
        "Tem streaming de vídeo?",
        "Como assinar Globo play pela Acesso?",
        "Posso colocar Globoplay na minha fatura?",
        "Quais streamings vocês oferecem?",
        "Valor da mensalidade da Globo"
      ],
      answer: "O Globoplay padrão com anúncios pode ser assinado por R$ 22,90 mensais diretamente na fatura da Acesso.",
      keywords: ["globoplay", "streaming", "filmes", "novelas", "vídeo"]
    }
  ],
  institucional_e_historia: [
    {
      category: "Sobre a Empresa",
      questions: [
        "Quem é a Acesso Net?",
        "A Acesso Net é de onde?",
        "Quanto tempo de mercado vocês têm?",
        "A Acesso Net é confiável?",
        "Onde fica a sede da empresa?",
        "História da Acesso Net",
        "É uma empresa grande?",
        "Quantos clientes vocês têm?",
        "A empresa é de confiança?",
        "Como a empresa começou?",
        "Vale a pena contratar vocês?",
        "Vocês são confiáveis?",
        "Desde quando a Acesso existe?"
      ],
      answer: "A Acesso Net é um provedor de internet de Sergipe com mais de 20 anos de experiência. A empresa possui sede em Estância e é reconhecida pela qualidade dos seus serviços.",
      keywords: ["empresa", "quem somos", "história", "estância", "confiança", "sergipe", "experiência"]
    }
  ],
  suporte_e_atendimento: [
    {
      category: "Suporte e Atendimento",
      questions: [
        "Como falar com o suporte?",
        "Qual o telefone da Acesso Net?",
        "Vocês atendem 24 horas?",
        "Qual o número do suporte?",
        "Como faço para falar com um atendente?",
        "Vocês têm whatsapp?",
        "Qual o horário de funcionamento do suporte?",
        "A internet caiu, para onde eu ligo?",
        "Como pedir assistência técnica?",
        "Tô sem internet, o que eu faço?",
        "Número da central de atendimento",
        "Como falar com um atendente humano?",
        "Preciso de suporte agora",
        "O atendimento é 24h?",
        "Como reclamar da internet?",
        "Preciso de um técnico na minha casa",
        "Quanto tempo demora para o técnico vir?"
      ],
      answer: "O suporte funciona 24 horas por dia, todos os dias da semana. O atendimento está disponível pelo telefone gratuito 0800 731 1030, pelo WhatsApp.",
      keywords: ["suporte", "atendimento", "telefone", "whatsapp", "ligar", "ajuda", "0800", "24h", "técnico"]
    }
  ],
  tecnologia_e_velocidade: [
    {
      category: "Tecnologia e Velocidade",
      questions: [
        "A internet cai quando chove?",
        "A internet é rápida?",
        "A internet de vocês é fibra ótica mesmo?",
        "A internet cai muito?",
        "A velocidade de envio é boa?",
        "O que significa velocidade simétrica?",
        "A internet é boa para jogar online?",
        "Serve para assistir netflix e youtube sem travar?",
        "Qual a tecnologia usada na internet?",
        "A fibra vai até dentro de casa?",
        "O ping é baixo para jogos?",
        "Consigo fazer live com essa internet?",
        "A velocidade de upload é alta?"
      ],
      answer: "A internet é 100% fibra óptica, o que garante estabilidade e proteção contra interferências, inclusive em dias de chuva. A velocidade de download e upload é simétrica, proporcionando navegação rápida e sem travamentos.",
      keywords: ["fibra", "estabilidade", "chuva", "rápida", "download", "upload", "jogar", "netflix"]
    }
  ],
  aplicativo_e_segunda_via: [
    {
      category: "Aplicativo e Segunda Via",
      questions: [
        "Como pego a segunda via do boleto?",
        "Posso pagar pelo celular?",
        "Como ver minha fatura?",
        "Vocês têm aplicativo?",
        "Como baixo o app da acesso.net?",
        "Esqueci de pagar, como pego outro boleto?",
        "Tem como pagar por pix?",
        "Como eu acesso a central do assinante?",
        "Dá para pagar a conta pelo celular?",
        "Tem app pra cliente?",
        "Posso resolver tudo pelo celular?",
        "Onde baixo o boleto?",
        "Minha fatura não chegou, e agora?",
        "Como ver o consumo da internet?",
        "Mudar forma de pagamento pelo app"
      ],
      answer: "Pelo aplicativo Acesso Net Fibra é possível retirar a segunda via do boleto, realizar pagamentos com PIX, acompanhar faturas e verificar o consumo de internet.",
      keywords: ["boleto", "fatura", "pix", "app", "aplicativo", "pagar", "celular", "segunda via"]
    }
  ],
  localizacao_e_cobertura: [
    {
      category: "Localização e Cobertura",
      questions: [
        "Onde fica a loja de vocês?",
        "Qual o endereço da acesso.net?",
        "Vocês atendem em quais cidades?",
        "Tem internet na praia do abaís?",
        "Vocês cobrem a praia do saco?",
        "Tem acesso.net em aracaju?",
        "A empresa é de estância?",
        "Vocês atendem litoral?",
        "Tem cobertura na minha região?",
        "Onde encontro uma loja física?",
        "Quais bairros vocês atendem?",
        "Tem Acesso Net na minha rua?",
        "Vocês chegam até o interior?"
      ],
      answer: "A loja física fica no centro de Estância, em Sergipe. A cobertura abrange diversas cidades da região e do litoral, incluindo Abaís, Praia do Saco, Porto do Mato e Aracaju.",
      keywords: ["endereço", "loja", "estância", "cidade", "cobertura", "aracaju", "abaís"]
    }
  ],
  internet_empresarial: [
    {
      category: "Internet Empresarial",
      questions: [
        "Vocês têm internet para empresas?",
        "Como funciona a internet para cnpj?",
        "O que é link dedicado?",
        "A internet empresarial é diferente?",
        "Tem plano corporativo?",
        "Minha empresa não pode ficar sem internet, o que vocês oferecem?",
        "Atendem lojas e prefeituras?",
        "Tem internet mais estável para empresa?",
        "Quanto custa o link dedicado?",
        "Vantagens da internet para CNPJ",
        "Como contratar internet empresarial?"
      ],
      answer: "Existem soluções específicas para empresas com link dedicado, oferecendo uma conexão exclusiva, estável e segura para negócios corporativos.",
      keywords: ["empresa", "cnpj", "link dedicado", "corporativo", "negócio"]
    }
  ],
  dados_oficiais: [
    {
      category: "Dados Oficiais",
      questions: [
        "Qual o CNPJ da empresa?",
        "Me passa o cnpj",
        "Qual o cnpj da acesso?",
        "Número do registro da empresa (CNPJ)"
      ],
      answer: "O nome oficial da empresa é JF Soluções Informática LTDA. Para informações sobre o CNPJ, é necessário realizar a solicitação diretamente pelo canal de atendimento oficial.",
      keywords: ["cnpj", "registro", "segurança"]
    },
    {
      category: "Dados Oficiais",
      questions: [
        "Qual o nome oficial da empresa?",
        "Qual a razão social da acesso.net?",
        "A empresa é legalizada?",
        "Como a empresa está registrada na receita?",
        "A acesso net é a jf soluções?",
        "Qual o nome no contrato?"
      ],
      answer: "O nome oficial é JF Soluções Informática LTDA. A empresa está devidamente legalizada e registrada nos órgãos competentes.",
      keywords: ["razão social", "nome oficial", "jf soluções", "legalizada"]
    }
  ],
  saudacoes: [
    {
      category: "Saudações",
      questions: [
        "Oi",
        "Olá",
        "Bom dia",
        "Boa tarde",
        "Boa noite",
        "Opa",
        "E aí",
        "Tudo bem?",
        "Como vai?",
        "Oi, tudo bom?"
      ],
      answer: "Olá! Tudo bem por aqui. Sou a assistente virtual da Acesso Net e estou aqui para tirar todas as suas dúvidas sobre nossos serviços de internet e saúde.",
      keywords: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "tudo bem"]
    }, 
    {
      category: "Saudações",
      questions: [
        "Quem é você?",
        "Como você se chama?",
        "Qual o seu nome?",
        "Você é uma IA?",
        "Com quem eu falo?",
        "O que você faz?",
        "Como pode me ajudar?"
      ],
      answer: "Eu sou a inteligência artificial da Acesso Net. Posso te passar informações sobre nossos planos de fibra óptica, serviços de saúde, telefonia móvel e suporte técnico.",
      keywords: ["quem", "nome", "ajudar", "faz", "voce"]
    }
  ],
  fallback: [
    {
      category: "Erro",
      questions: ["erro_entendimento"],
      answer: "Desculpa, não entendi muito bem. Você pode repetir ou perguntar de outra forma?",
      keywords: ["desculpa", "repetir", "entendi"]
    }
  ]
};
