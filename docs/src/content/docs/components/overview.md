---
title: Catalogue des Composants UI
description: Répertoire exhaustif des composants réutilisables, leur rôle, leurs props et leur niveau de granularité.
---

Les composants sont organisés dans `src/lib/components/` selon des principes de modularité forte : composants de présentation purs, primitives UI réutilisables et sections composites.

Les composants de l'application sont modulaires et organisés par domaine métier dans `src/lib/components/` :

## 1. Primitives & Composants Communs (`ui/`, `navigation/`)
- [`Modal.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/Modal.svelte) : Dialogue modal accessible avec fentes (snippets) et gestion Échap.
- [`SearchInput.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/SearchInput.svelte) : Champ de recherche avec debounce, reset et indicateur de chargement.
- [`Icon.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/Icon.svelte) : Rendu d'icônes vectorielles natives Lucide ou personnalisées.
- [`EmojiButton.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/EmojiButton.svelte) & [`EmojiPickerPopover.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/ui/EmojiPickerPopover.svelte) : Sélecteur d'émojis standard et de packs personnalisés.
- [`VoiceMessagePlayer.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/VoiceMessagePlayer.svelte) : Lecteur audio avec waveform dynamique et scrubbing.
- [`NotificationMenu.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/NotificationMenu.svelte) & [`NotificationItem.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/navigation/NotificationItem.svelte) : Menu déroulant des notifications en temps réel.

## 2. Écosystème Publications & Édition (`post/`, `post/editor/`)
- [`Post.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/Post.svelte) & [`PostHeader.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/post/PostHeader.svelte) : Carte de publication orchestrant médias, texte, auteur et actions.
- [`PostCarousel.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/PostCarousel.svelte) : Carrousel interactif avec auto-play vidéo intelligent.
- [`CarouselSlideEditor.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/post/editor/CarouselSlideEditor.svelte) : Éditeur unifié pour slides texte et média.
- [`CarouselThumbnailsBar.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/post/editor/CarouselThumbnailsBar.svelte) : Barre de vignettes et ajout rapide de diapositives.
- [`AssetPackPickerModal.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/post/editor/AssetPackPickerModal.svelte) : Sélection d'un pack d'icônes ou d'émojis à lier au post.

## 3. Commentaires & Réactions (`comments/`)
- [`CommentSection.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/CommentSection.svelte) : Volet dépliable avec pagination des commentaires.
- [`CommentBaseItem.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/comments/CommentBaseItem.svelte) : Rendu factorisé d'un commentaire ou d'une réponse (actions, édition inline, likes, vocal).
- [`CommentComposer.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/comments/CommentComposer.svelte) : Formulaire de saisie avec texte riche, émojis et enregistrement vocal.

## 4. Messagerie & Chat (`chat/`)
- [`ChatHeader.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/chat/ChatHeader.svelte) : En-tête de conversation directe ou de groupe avec statut en ligne.
- [`ChatMessageItem.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/chat/ChatMessageItem.svelte) : Bulle de message (texte, vocal, image, statut de lecture et horodatage).
- [`ChatInputBar.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/chat/ChatInputBar.svelte) : Barre de saisie multifonction avec upload et raccourcis.
- [`ChatAudioRecorder.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/chat/ChatAudioRecorder.svelte) : Enregistreur vocal micro avec pré-écoute et annulation.

## 5. Stories & Médias (`stories/`, `media-editor/`)
- [`StoryViewerModal.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/stories/StoryViewerModal.svelte) : Lecteur immersif plein écran (progression, gestes, réponses, likes).
- [`StoryCreator.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/stories/StoryCreator.svelte) : Interface de composition de story.
- [`MediaEditorModal.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/media-editor/MediaEditorModal.svelte) : Retouche photo, filtres, dessin au trait et calques de texte.

## 6. Paramètres (`settings/`)
- [`SettingsMedia.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/settings/SettingsMedia.svelte) & sous-cartes : Gestion du quota disque et nettoyage ciblé des fichiers.
- [`SettingsFeeds.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/settings/SettingsFeeds.svelte) & `FeedConfigForm.svelte` : Création et personnalisation de flux composites.
- [`SettingsEmojis.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/settings/SettingsEmojis.svelte) & [`SettingsIcons.svelte`](file:///home/nubiz/Documents/projets/social/social_front/src/lib/components/settings/SettingsIcons.svelte) : Gestion des packs et favoris.

## 7. Administration (`admin/`)
- Onglets modulaires `AdminUsersTab`, `AdminPostsTab`, `AdminStoriesTab`, `AdminStorageTab`, `AdminGlobalActionsTab`, `AdminAppearance`.

