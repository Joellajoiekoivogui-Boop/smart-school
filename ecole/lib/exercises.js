/**
 * Banque d'exercices de l'espace Entraînement (QCM corrigés automatiquement).
 * `answer` est l'index de la bonne réponse dans `choices`.
 */
export const EXERCISES = [
  // ---------- Mathématiques ----------
  { id: 'x-m1', subjectId: 'maths', topic: 'Fractions', question: 'Combien vaut 1/2 + 1/4 ?', choices: ['2/6', '3/4', '1/6', '2/4'], answer: 1, explanation: 'On met au même dénominateur : 1/2 = 2/4, donc 2/4 + 1/4 = 3/4.' },
  { id: 'x-m2', subjectId: 'maths', topic: 'Fractions', question: 'Quelle est la forme simplifiée de 12/18 ?', choices: ['6/9', '2/3', '3/4', '4/6'], answer: 1, explanation: 'Le PGCD de 12 et 18 est 6 : 12÷6 = 2 et 18÷6 = 3.' },
  { id: 'x-m3', subjectId: 'maths', topic: 'Fractions', question: 'Combien vaut 2/3 × 3/5 ?', choices: ['6/15 = 2/5', '5/8', '6/8', '5/15'], answer: 0, explanation: 'On multiplie les numérateurs entre eux et les dénominateurs entre eux : 6/15, qui se simplifie en 2/5.' },
  { id: 'x-m4', subjectId: 'maths', topic: 'Fractions', question: 'Quelle fraction est la plus grande ?', choices: ['3/8', '1/2', '2/5', '5/12'], answer: 1, explanation: 'En décimal : 0,375 ; 0,5 ; 0,4 ; 0,416… La plus grande est 1/2.' },
  { id: 'x-m5', subjectId: 'maths', topic: 'Équations', question: 'Résoudre 3x + 5 = 20.', choices: ['x = 3', 'x = 5', 'x = 25/3', 'x = 15'], answer: 1, explanation: '3x = 20 − 5 = 15, donc x = 15 ÷ 3 = 5.' },
  { id: 'x-m6', subjectId: 'maths', topic: 'Équations', question: 'Résoudre 2(x − 1) = 8.', choices: ['x = 3', 'x = 4', 'x = 5', 'x = 9'], answer: 2, explanation: 'x − 1 = 4 donc x = 5.' },
  { id: 'x-m7', subjectId: 'maths', topic: 'Puissances', question: 'Combien vaut 2⁵ ?', choices: ['10', '25', '32', '64'], answer: 2, explanation: '2 × 2 × 2 × 2 × 2 = 32.' },
  { id: 'x-m8', subjectId: 'maths', topic: 'Géométrie', question: 'La somme des angles d’un triangle vaut :', choices: ['90°', '180°', '270°', '360°'], answer: 1, explanation: 'Dans tout triangle, la somme des trois angles vaut 180°.' },

  // ---------- Français ----------
  { id: 'x-f1', subjectId: 'francais', topic: 'Conjugaison', question: 'Conjuguez « finir » à la 1re personne du pluriel du passé simple.', choices: ['nous finissions', 'nous finîmes', 'nous finirons', 'nous avons fini'], answer: 1, explanation: 'Verbe du 2e groupe au passé simple : nous finîmes.' },
  { id: 'x-f2', subjectId: 'francais', topic: 'Conjugaison', question: '« Ils ___ à l’école hier. » (aller, passé composé)', choices: ['ont allé', 'sont allés', 'sont allé', 'allaient'], answer: 1, explanation: '« Aller » se conjugue avec l’auxiliaire être et s’accorde avec le sujet : ils sont allés.' },
  { id: 'x-f3', subjectId: 'francais', topic: 'Grammaire', question: 'Dans « Le chat de Fanta dort », quel est le sujet ?', choices: ['Le chat', 'Le chat de Fanta', 'Fanta', 'dort'], answer: 1, explanation: 'Le groupe sujet complet est « Le chat de Fanta » (qui dort ?).' },
  { id: 'x-f4', subjectId: 'francais', topic: 'Orthographe', question: 'Quelle phrase est correcte ?', choices: ['Les fleurs que j’ai cueilli.', 'Les fleurs que j’ai cueillies.', 'Les fleurs que j’ai cueillie.', 'Les fleurs que j’ai cueillis.'], answer: 1, explanation: 'Le COD « que » (= les fleurs) est placé avant l’auxiliaire avoir : le participe s’accorde au féminin pluriel.' },
  { id: 'x-f5', subjectId: 'francais', topic: 'Grammaire', question: 'Quelle est la nature du mot « rapidement » ?', choices: ['Adjectif', 'Adverbe', 'Nom', 'Verbe'], answer: 1, explanation: 'Les mots en -ment formés sur un adjectif sont des adverbes de manière.' },

  // ---------- Anglais ----------
  { id: 'x-a1', subjectId: 'anglais', topic: 'Grammar', question: 'She ___ to school every day.', choices: ['go', 'goes', 'going', 'gone'], answer: 1, explanation: 'Present simple, 3rd person singular: add -s/-es → goes.' },
  { id: 'x-a2', subjectId: 'anglais', topic: 'Tenses', question: 'Yesterday, we ___ football.', choices: ['play', 'plays', 'played', 'playing'], answer: 2, explanation: '« Yesterday » indique le passé : past simple → played.' },
  { id: 'x-a3', subjectId: 'anglais', topic: 'Vocabulary', question: 'What is « bibliothèque » in English?', choices: ['Bookshop', 'Library', 'Librery', 'Bookcase'], answer: 1, explanation: 'Library = bibliothèque ; bookshop = librairie (faux-ami !).' },
  { id: 'x-a4', subjectId: 'anglais', topic: 'Grammar', question: 'There ___ many students in the class.', choices: ['is', 'are', 'be', 'am'], answer: 1, explanation: '« Students » est pluriel → there are.' },
  { id: 'x-a5', subjectId: 'anglais', topic: 'Tenses', question: 'Look! It ___ .', choices: ['rains', 'is raining', 'rained', 'rain'], answer: 1, explanation: '« Look! » décrit une action en cours : present continuous.' },

  // ---------- Physique ----------
  { id: 'x-p1', subjectId: 'physique', topic: 'Électricité', question: 'Quelle est l’unité de la tension électrique ?', choices: ['Ampère (A)', 'Volt (V)', 'Ohm (Ω)', 'Watt (W)'], answer: 1, explanation: 'La tension se mesure en volts avec un voltmètre branché en dérivation.' },
  { id: 'x-p2', subjectId: 'physique', topic: 'Électricité', question: 'Loi d’Ohm : U = 12 V, R = 4 Ω. Combien vaut I ?', choices: ['48 A', '3 A', '0,33 A', '16 A'], answer: 1, explanation: 'I = U / R = 12 / 4 = 3 A.' },
  { id: 'x-p3', subjectId: 'physique', topic: 'Mécanique', question: 'Une voiture parcourt 120 km en 2 h. Sa vitesse moyenne est :', choices: ['240 km/h', '60 km/h', '122 km/h', '30 km/h'], answer: 1, explanation: 'v = d / t = 120 / 2 = 60 km/h.' },
  { id: 'x-p4', subjectId: 'physique', topic: 'Optique', question: 'Dans un milieu homogène, la lumière se propage :', choices: ['En ligne droite', 'En zigzag', 'En cercle', 'Elle ne se propage pas'], answer: 0, explanation: 'C’est le principe de propagation rectiligne de la lumière.' },
  { id: 'x-p5', subjectId: 'physique', topic: 'Énergie', question: 'Quelle source d’énergie est renouvelable ?', choices: ['Pétrole', 'Charbon', 'Solaire', 'Gaz naturel'], answer: 2, explanation: 'Le soleil est une source inépuisable à notre échelle.' },

  // ---------- Chimie ----------
  { id: 'x-c1', subjectId: 'chimie', topic: 'Atomes et molécules', question: 'Quelle est la formule de l’eau ?', choices: ['CO₂', 'H₂O', 'O₂', 'NaCl'], answer: 1, explanation: 'Une molécule d’eau contient 2 atomes d’hydrogène et 1 atome d’oxygène.' },
  { id: 'x-c2', subjectId: 'chimie', topic: 'Mélanges', question: 'L’eau salée est un mélange :', choices: ['Hétérogène', 'Homogène', 'Ce n’est pas un mélange', 'Gazeux'], answer: 1, explanation: 'On ne distingue pas le sel dissous à l’œil nu : mélange homogène.' },
  { id: 'x-c3', subjectId: 'chimie', topic: 'Réactions chimiques', question: 'Lors d’une combustion, le carbone réagit avec :', choices: ['L’azote', 'Le dioxygène', 'L’hydrogène', 'L’hélium'], answer: 1, explanation: 'Une combustion consomme du dioxygène (comburant).' },
  { id: 'x-c4', subjectId: 'chimie', topic: 'Atomes et molécules', question: 'Le symbole chimique du fer est :', choices: ['F', 'Fe', 'Fr', 'Ir'], answer: 1, explanation: 'Fe, du latin ferrum.' },

  // ---------- Informatique ----------
  { id: 'x-i1', subjectId: 'info', topic: 'Algorithmique', question: 'Un algorithme est :', choices: ['Un virus', 'Une suite d’instructions pour résoudre un problème', 'Un logiciel de dessin', 'Un composant de l’ordinateur'], answer: 1, explanation: 'Un algorithme décrit, étape par étape, comment résoudre un problème.' },
  { id: 'x-i2', subjectId: 'info', topic: 'Bureautique', question: 'Dans un tableur, quelle formule calcule la moyenne de A1 à A5 ?', choices: ['=SOMME(A1:A5)', '=MOYENNE(A1:A5)', '=MAX(A1:A5)', '=A1+A5/2'], answer: 1, explanation: 'La fonction MOYENNE calcule la moyenne d’une plage de cellules.' },
  { id: 'x-i3', subjectId: 'info', topic: 'Internet et sécurité', question: 'Quel mot de passe est le plus sûr ?', choices: ['123456', 'motdepasse', 'Kx7!pL9#qT', 'mohamed2012'], answer: 2, explanation: 'Un mot de passe long, mêlant lettres, chiffres et symboles, est bien plus difficile à deviner.' },
  { id: 'x-i4', subjectId: 'info', topic: 'Programmation', question: 'Que vaut x après : x = 3 ; x = x + 2 ?', choices: ['3', '2', '5', '32'], answer: 2, explanation: 'On ajoute 2 à la valeur actuelle de x : 3 + 2 = 5.' },

  // ---------- Compléments v2 : entraînement personnalisé ----------
  { id: 'x-m9', subjectId: 'maths', topic: 'Fractions', question: 'Combien vaut 3/4 − 1/3 ?', choices: ['2/1', '5/12', '2/7', '1/2'], answer: 1, explanation: 'Dénominateur commun 12 : 9/12 − 4/12 = 5/12.' },
  { id: 'x-m10', subjectId: 'maths', topic: 'Fractions', question: 'Combien vaut 2/5 ÷ 4/5 ?', choices: ['1/2', '8/25', '2', '6/5'], answer: 0, explanation: 'Diviser, c’est multiplier par l’inverse : 2/5 × 5/4 = 10/20 = 1/2.' },
  { id: 'x-m11', subjectId: 'maths', topic: 'Fractions', question: 'Quelle fraction est égale à 0,75 ?', choices: ['7/5', '3/4', '75/10', '1/75'], answer: 1, explanation: '0,75 = 75/100 = 3/4 après simplification par 25.' },
  { id: 'x-m12', subjectId: 'maths', topic: 'Fractions', question: 'Les 2/3 d’une classe de 30 élèves sont des filles. Combien de filles ?', choices: ['10', '15', '20', '23'], answer: 2, explanation: '2/3 × 30 = 60/3 = 20.' },
  { id: 'x-m13', subjectId: 'maths', topic: 'Puissances', question: 'Combien vaut 10⁻² ?', choices: ['−100', '0,01', '0,1', '−20'], answer: 1, explanation: '10⁻² = 1/10² = 1/100 = 0,01.' },
  { id: 'x-m14', subjectId: 'maths', topic: 'Puissances', question: 'Simplifier 3² × 3³.', choices: ['3⁵', '3⁶', '9⁵', '6⁵'], answer: 0, explanation: 'On additionne les exposants : 3²⁺³ = 3⁵.' },
  { id: 'x-m15', subjectId: 'maths', topic: 'Statistiques', question: 'Moyenne de 12, 14 et 16 ?', choices: ['13', '14', '15', '42'], answer: 1, explanation: '(12 + 14 + 16) ÷ 3 = 42 ÷ 3 = 14.' },
  { id: 'x-m16', subjectId: 'maths', topic: 'Géométrie', question: 'Aire d’un rectangle de 6 cm sur 4 cm ?', choices: ['10 cm²', '20 cm²', '24 cm²', '24 cm'], answer: 2, explanation: 'Aire = longueur × largeur = 6 × 4 = 24 cm².' },
  { id: 'x-m17', subjectId: 'maths', topic: 'Équations', question: 'Résoudre x/4 = 3.', choices: ['x = 7', 'x = 12', 'x = 3/4', 'x = 1'], answer: 1, explanation: 'On multiplie les deux membres par 4 : x = 12.' },

  { id: 'x-f6', subjectId: 'francais', topic: 'Conjugaison', question: '« Demain, nous ___ au marché. » (aller, futur)', choices: ['allons', 'irons', 'allions', 'irions'], answer: 1, explanation: 'Futur simple de « aller » : nous irons.' },
  { id: 'x-f7', subjectId: 'francais', topic: 'Orthographe', question: 'Complétez : « Ils ___ partis tôt. »', choices: ['son', 'sont', 'sons', 'sontent'], answer: 1, explanation: '« Sont » est le verbe être (on peut dire « étaient »).' },
  { id: 'x-f8', subjectId: 'francais', topic: 'Grammaire', question: 'Dans « Aminata lit un livre », « un livre » est :', choices: ['Sujet', 'COD', 'COI', 'Attribut'], answer: 1, explanation: 'Aminata lit quoi ? un livre : complément d’objet direct.' },

  { id: 'x-a6', subjectId: 'anglais', topic: 'Vocabulary', question: 'What is « le marché » in English?', choices: ['The market', 'The march', 'The shop', 'The mall'], answer: 0, explanation: 'Market = marché.' },
  { id: 'x-a7', subjectId: 'anglais', topic: 'Grammar', question: 'I ___ 13 years old.', choices: ['have', 'am', 'is', 'has'], answer: 1, explanation: 'En anglais, on utilise « to be » pour l’âge : I am 13.' },

  { id: 'x-p6', subjectId: 'physique', topic: 'Électricité', question: 'Dans un circuit en série, si une lampe grille :', choices: ['Les autres brillent plus', 'Les autres s’éteignent', 'Rien ne change', 'Le générateur explose'], answer: 1, explanation: 'Le circuit est ouvert : le courant ne passe plus nulle part.' },
  { id: 'x-p7', subjectId: 'physique', topic: 'Mécanique', question: 'L’unité du poids est :', choices: ['le kilogramme', 'le newton', 'le joule', 'le mètre'], answer: 1, explanation: 'Le poids est une force, mesurée en newtons (N).' },

  { id: 'x-s1', subjectId: 'svt', topic: 'La cellule', question: 'Quel élément contient l’information génétique ?', choices: ['La membrane', 'Le noyau', 'Le cytoplasme', 'La vacuole'], answer: 1, explanation: 'Le noyau contient l’ADN.' },
  { id: 'x-s2', subjectId: 'svt', topic: 'Nutrition', question: 'Où se termine principalement la digestion ?', choices: ['Estomac', 'Intestin grêle', 'Bouche', 'Foie'], answer: 1, explanation: 'L’intestin grêle termine la digestion et absorbe les nutriments.' },
  { id: 'x-s3', subjectId: 'svt', topic: 'Écosystèmes', question: 'Dans une chaîne alimentaire, les plantes sont :', choices: ['Des consommateurs', 'Des producteurs', 'Des décomposeurs', 'Des prédateurs'], answer: 1, explanation: 'Grâce à la photosynthèse, les plantes produisent leur matière.' },
  { id: 'x-s4', subjectId: 'svt', topic: 'Reproduction', question: 'La fécondation est la rencontre :', choices: ['De deux ovules', 'D’un ovule et d’un spermatozoïde', 'De deux cellules du sang', 'De deux noyaux de la peau'], answer: 1, explanation: 'Elle donne une cellule-œuf.' },

  { id: 'x-h1', subjectId: 'histgeo', topic: 'Indépendances', question: 'En quelle année la Guinée est-elle devenue indépendante ?', choices: ['1945', '1958', '1960', '1984'], answer: 1, explanation: 'Le 2 octobre 1958, après le « non » au référendum du 28 septembre.' },
  { id: 'x-h2', subjectId: 'histgeo', topic: 'Afrique précoloniale', question: 'Qui a fondé l’empire du Mali ?', choices: ['Samory Touré', 'Soundiata Keïta', 'Mansa Moussa', 'Alfa Yaya'], answer: 1, explanation: 'Soundiata Keïta, vainqueur à Kirina vers 1235.' },
  { id: 'x-h3', subjectId: 'histgeo', topic: 'Géographie de la Guinée', question: 'Combien de régions naturelles compte la Guinée ?', choices: ['2', '3', '4', '6'], answer: 2, explanation: 'Basse-Guinée, Moyenne-Guinée, Haute-Guinée et Guinée forestière.' },
  { id: 'x-h4', subjectId: 'histgeo', topic: 'Géographie de la Guinée', question: 'Quel grand fleuve prend sa source en Guinée ?', choices: ['Le Nil', 'Le Niger', 'Le Congo', 'Le Zambèze'], answer: 1, explanation: 'Le Niger naît dans le massif du Fouta-Djalon / dorsale guinéenne.' },
  { id: 'x-h5', subjectId: 'histgeo', topic: 'Colonisation', question: 'Quel résistant a combattu la colonisation française en Haute-Guinée ?', choices: ['Samory Touré', 'Ahmed Sékou Touré', 'Lansana Conté', 'Alpha Condé'], answer: 0, explanation: 'Samory Touré a résisté jusqu’à sa capture en 1898.' },

  { id: 'x-c5', subjectId: 'chimie', topic: 'Réactions chimiques', question: 'Lors d’une réaction chimique, la masse totale :', choices: ['Augmente', 'Diminue', 'Se conserve', 'Double'], answer: 2, explanation: 'Loi de Lavoisier : rien ne se perd, rien ne se crée.' },
  { id: 'x-i5', subjectId: 'info', topic: 'Internet et sécurité', question: 'Que faire face à un message qui demande votre mot de passe ?', choices: ['Répondre vite', 'Ne jamais le donner', 'Le partager à un ami', 'Le publier'], answer: 1, explanation: 'Aucun service sérieux ne demande votre mot de passe par message.' },
];
