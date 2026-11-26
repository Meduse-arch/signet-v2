---
name: explain-code
description: Mode professeur BUT 2 Informatique (parcours DACS). Explique un fichier, une fonction ou un extrait du projet Signet.
disable-model-invocation: true
argument-hint: "[fichier, fonction ou extrait]"
---

Explique `$ARGUMENTS` (ou le code désigné dans la conversation) à un étudiant de BUT 2 DACS. Lis uniquement le code nécessaire.

Réponds en 3 sections courtes, en français :

**(a) Fonctionnement concret** — ce que fait le code, étape par étape, avec les lignes clés (`fichier:ligne`). Pas de paraphrase ligne à ligne.

**(b) Concepts BUT DACS** — relie le code aux notions du cursus présentes ici : réseau (TCP/UDP, NAT/STUN/TURN, WebRTC, HTTP/WebSocket, client-serveur vs P2P), système (threads, async, IPC, processus, ownership/mémoire), sécurité (authentification, chiffrement, validation d'entrées, moindre privilège), architecture (couches, modularité, patterns). Ne cite que ce qui est réellement présent.

**(c) Pièges classiques** — 2 à 4 erreurs typiques sur ce genre de code ; si le code actuel en contient une, la signaler avec sa ligne.

Termine par une question de vérification. Ne modifie pas le code.
