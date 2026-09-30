// Ported from AgriVision — presentation/chat/KrishiMitriChatScreen.kt
// (+ KrishiMitriChatViewModel.kt, ChatModels.kt, ChatTheme.kt)
import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

const BOT_AVATAR = require('../../assets/app/bot.png');
const BOT_BORDER = '#E0E0E0'; // fixed outline for bot bubbles (ChatMessageItem)

// ChatModels.kt — Long.toTimeString() -> SimpleDateFormat("hh:mm a")
function toTimeString(ts) {
  const d = new Date(ts);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

// KrishiMitriChatViewModel.kt — generateContextualQuickReplies()
function makeQuickRepliesFor(botReply) {
  const lower = botReply.toLowerCase();
  if (lower.includes('disease') || lower.includes('pest')) {
    return [
      { text: 'Prevention tips', emoji: '🛡️' },
      { text: 'Treatment options', emoji: '💊' },
    ];
  }
  if (lower.includes('weather') || lower.includes('rain')) {
    return [
      { text: '7-day forecast', emoji: '📅' },
      { text: 'Irrigation advice', emoji: '💧' },
    ];
  }
  if (lower.includes('price') || lower.includes('market')) {
    return [
      { text: 'Nearby mandis', emoji: '🏪' },
      { text: 'Best time to sell', emoji: '⏰' },
    ];
  }
  return [
    { text: 'More info', emoji: 'ℹ️' },
    { text: 'Ask something else', emoji: '💬' },
  ];
}

// KrishiMitriChatViewModel.kt — sendWelcomeMessage()
function makeWelcomeMessage(userName) {
  return {
    id: `welcome-${Date.now()}`,
    text:
      `Namaste ${userName}! 🙏\n\n` +
      "I'm KrishiMitri, your AI-powered farming assistant. " +
      'I can help you with crop diseases, weather information, market prices, ' +
      'and farming best practices.\n\n' +
      'How can I assist you today?',
    isUser: false,
    timestamp: Date.now(),
    quickReplies: [
      { text: 'Identify crop disease', emoji: '🦠' },
      { text: 'Weather forecast', emoji: '☀️' },
      { text: 'Market prices', emoji: '💰' },
      { text: 'Best farming tips', emoji: '🌱' },
      { text: 'Fertilizer advice', emoji: '🧪' },
    ],
  };
}

// KrishiMitriChatViewModel.kt — handleErrorResponse()
function buildErrorText(err) {
  const msg = (err && err.message) || '';
  if (msg.includes('Unable to resolve host')) {
    return 'Unable to connect. Please check your internet connection.';
  }
  if (msg.includes('401')) {
    return 'Authentication failed. Please check API key configuration.';
  }
  if (msg.includes('429')) {
    return 'Too many requests. Please wait a moment.';
  }
  return `Sorry, I encountered an error: ${msg}. Please try again.`;
}

export default function KrishiMitriChatScreen() {
  const navigation = useNavigation();
  const { isDark, toggleTheme, user } = useApp();
  const userName = (user && user.name) || 'Farmer'; // setUserName default

  const [messages, setMessages] = useState(() => [makeWelcomeMessage(userName)]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const conversationHistory = useRef([]);
  const scrollRef = useRef(null);

  const chat = isDark ? colors.chat.dark : colors.chat.light;

  // LaunchedEffect(state.messages.size) -> auto scroll to bottom
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current && scrollRef.current.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(t);
  }, [messages, isLoading]);

  // onUserSend + ChatRepository.sendMessage -> api.chatCompletion
  const send = async (text) => {
    if (!text || isLoading) return;

    setInput('');
    setError(null);

    const userMsg = {
      id: `u-${Date.now()}`,
      text,
      isUser: true,
      timestamp: Date.now(),
      quickReplies: [],
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    conversationHistory.current.push({ role: 'user', content: text });
    if (conversationHistory.current.length > 20) {
      conversationHistory.current.splice(0, conversationHistory.current.length - 20);
    }

    try {
      const result = await api.chatCompletion([...conversationHistory.current]);
      const botReply = result.content;

      conversationHistory.current.push({ role: 'assistant', content: botReply });
      if (conversationHistory.current.length > 20) {
        conversationHistory.current.splice(0, conversationHistory.current.length - 20);
      }

      const botMsg = {
        id: `b-${Date.now()}`,
        text: botReply,
        isUser: false,
        timestamp: Date.now(),
        quickReplies: makeQuickRepliesFor(botReply),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      setError(e.message || 'Unknown error');
      const errMsg = {
        id: `e-${Date.now()}`,
        text: buildErrorText(e),
        isUser: false,
        timestamp: Date.now(),
        quickReplies: [{ text: 'Retry', emoji: '🔄' }],
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const onUserSend = () => {
    if (input.trim() !== '') {
      send(input.trim());
    }
  };

  // onQuickReplyClick (Retry -> resend last user message)
  const onQuickReplyClick = (reply) => {
    if (reply.text.toLowerCase() === 'retry') {
      const lastUser = [...messages].reverse().find((m) => m.isUser);
      if (lastUser) {
        send(lastUser.text);
      }
      return;
    }
    send(reply.text);
  };

  // resetChat()
  const resetChat = () => {
    conversationHistory.current = [];
    setError(null);
    setMessages([makeWelcomeMessage(userName)]);
  };

  const canSend = input.trim() !== '' && !isLoading;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: chat.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* TopAppBar */}
        <View style={[styles.header, { backgroundColor: chat.surface }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={chat.botText} />
          </TouchableOpacity>

          <View style={[styles.avatar, { backgroundColor: chat.primaryContainer }]}>
            <Image source={BOT_AVATAR} style={styles.avatarImg} />
          </View>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: chat.botText }]} numberOfLines={1}>
              KrishiMitri
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: textMuted(chat.botText) }]}
              numberOfLines={1}
            >
              Smart Farm Assistant
            </Text>
          </View>

          <TouchableOpacity style={styles.headerBtn} onPress={toggleTheme} hitSlop={8}>
            <MaterialIcons
              name={isDark ? 'light-mode' : 'dark-mode'}
              size={24}
              color={chat.botText}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={resetChat} hitSlop={8}>
            <MaterialIcons name="refresh" size={24} color={chat.botText} />
          </TouchableOpacity>
        </View>

        {/* Message list */}
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <ChatMessageItem
              key={msg.id}
              message={msg}
              chat={chat}
              isDark={isDark}
              onQuickReplyClick={onQuickReplyClick}
            />
          ))}
          {isLoading && <TypingIndicator chat={chat} />}
        </ScrollView>

        {/* ChatInputBar (bottomBar) */}
        <View style={[styles.inputBar, { backgroundColor: chat.surface }]}>
          <View
            style={[
              styles.inputField,
              {
                backgroundColor: chat.inputBackground,
                borderColor: chat.inputBorder,
              },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask me anything..."
              placeholderTextColor={textMuted(chat.botText)}
              multiline
              style={[styles.inputText, { color: chat.botText }]}
              editable={!isLoading}
            />
            <TouchableOpacity style={styles.micBtn} disabled={isLoading} hitSlop={8}>
              <MaterialIcons name="mic" size={24} color={chat.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.sendWrap}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onUserSend}
              disabled={!canSend}
              style={[styles.sendBtn, { backgroundColor: chat.primary, opacity: canSend ? 1 : 0.5 }]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={chat.userText} />
              ) : (
                <MaterialIcons name="send" size={20} color={chat.userText} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// top-level so it can be used before component definition in styles
function textMuted(base) {
  const hex = base.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},0.5)`;
}

// ChatMessageItem — ChatScreen.kt
function ChatMessageItem({ message, chat, isDark, onQuickReplyClick }) {
  const bubbleStyle = message.isUser
    ? styles.bubbleUser
    : [styles.bubbleBot, { borderColor: BOT_BORDER }];

  return (
    <View
      style={[
        styles.msgColumn,
        { alignItems: message.isUser ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View style={[styles.msgRow, { justifyContent: message.isUser ? 'flex-end' : 'flex-start' }]}>
        <View
          style={[
            styles.bubble,
            bubbleStyle,
            {
              maxWidth: 280,
              backgroundColor: message.isUser ? chat.userBubble : chat.botBubble,
            },
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: message.isUser ? chat.userText : chat.botText },
            ]}
          >
            {message.text}
          </Text>
        </View>
      </View>

      <Text style={[styles.timestamp, { color: textMuted(isDark ? '#E8E8E8' : '#212121') }]}>
        {toTimeString(message.timestamp)}
      </Text>

      {message.quickReplies.length > 0 && (
        <View style={styles.quickRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRowContent}
            keyboardShouldPersistTaps="handled"
          >
            {message.quickReplies.map((reply) => (
              <TouchableOpacity
                key={`${message.id}-${reply.text}`}
                onPress={() => onQuickReplyClick(reply)}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: chat.quickReplyBg,
                    borderColor: chat.quickReplyBorder,
                  },
                ]}
              >
                {reply.emoji !== '' && (
                  <Text style={styles.quickEmoji}>{reply.emoji}</Text>
                )}
                <Text style={[styles.quickText, { color: chat.botText }]} numberOfLines={1}>
                  {reply.text}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// TypingIndicator — ChatScreen.kt (three bouncing dots)
function TypingIndicator({ chat }) {
  const dots = useRef([
    new Animated.Value(0.5),
    new Animated.Value(0.5),
    new Animated.Value(0.5),
  ]).current;

  useEffect(() => {
    const loops = dots.map((d, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(d, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.5, duration: 600, useNativeDriver: true }),
        ])
      )
    );
    const staggered = loops.map((loop, index) =>
      Animated.sequence([Animated.delay(index * 150), loop])
    );
    staggered.forEach((s) => s.start());
    return () => staggered.forEach((s) => s.stop());
  }, [dots]);

  return (
    <View style={styles.typingRow}>
      <View style={[styles.typingBubble, { backgroundColor: chat.botBubble, borderColor: BOT_BORDER }]}>
        {dots.map((dot, i) => (
          <Animated.View
            key={`dot-${i}`}
            style={[
              styles.typingDot,
              { backgroundColor: chat.botText, opacity: 0.6, transform: [{ scale: dot }] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginLeft: 4,
  },
  avatarImg: { width: 40, height: 40 },
  headerTitleWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 11, marginTop: 1 },
  messageList: { padding: 16, paddingBottom: 24 },
  msgColumn: { width: '100%', marginBottom: 8 },
  msgRow: { flexDirection: 'row' },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 0,
  },
  bubbleUser: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  bubbleBot: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderWidth: 1,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  timestamp: {
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  quickRow: { marginTop: 8 },
  quickRowContent: { paddingHorizontal: 4, gap: 8 },
  quickChip: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  quickEmoji: { fontSize: 16, marginRight: 6 },
  quickText: { fontSize: 13 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  inputField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    maxHeight: 110,
    paddingVertical: 10,
  },
  micBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sendWrap: { marginLeft: 8 },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  typingRow: { paddingVertical: 8, alignItems: 'flex-start' },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  typingDot: { width: 8, height: 8, borderRadius: 4 },
});
