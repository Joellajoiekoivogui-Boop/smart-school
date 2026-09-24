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
];
