import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  generateSystemPrompt,
  Message,
  streamAIResponse,
} from "@/services/AICopilot";

const QUICK_ACTIONS = [
  "Analyze RAM",
  "Deep Clean Suggestion",
  "Find Battery Drains",
  "How to speed up my device?",
];

export default function CopilotScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "System initialized. Nabd AI Copilot ready for optimization duties.",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);
    scrollToBottom();

    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMsg]);

    const systemContext = await generateSystemPrompt();
    let fullResponse = "";

    await streamAIResponse(text, systemContext, (token) => {
      fullResponse += token;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId ? { ...msg, content: fullResponse } : msg
        )
      );
      scrollToBottom();
    });

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantId ? { ...msg, isStreaming: false } : msg
      )
    );
    setIsTyping(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 10 }]}>
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: colors.foreground }]}>Nabd AI Copilot</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: "#22c55e" }]} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              Model: Qwen-1.5B-Chat-Q4 | Local
            </Text>
          </View>
        </View>
        <Feather name="cpu" size={20} color={colors.primary} />
      </View>

      {/* Chat Feed */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.feed}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <Animated.View
            key={msg.id}
            entering={FadeInDown.duration(400)}
            layout={Layout.springify()}
            style={[
              styles.messageWrapper,
              msg.role === "user" ? styles.userWrapper : styles.assistantWrapper,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                msg.role === "user"
                  ? [styles.userBubble, { backgroundColor: colors.primary }]
                  : [styles.assistantBubble, { backgroundColor: colors.secondary, borderColor: colors.border }],
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { color: msg.role === "user" ? "#fff" : colors.foreground },
                ]}
              >
                {msg.content}
                {msg.isStreaming && <Text style={{ color: colors.primary }}>█</Text>}
              </Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Footer Area */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 84, 16) }]}>
        {/* Quick Action Chips */}
        {!isTyping && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action}
                onPress={() => handleSend(action)}
                accessibilityRole="button"
                accessibilityLabel={action}
                style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Text style={[styles.chipText, { color: colors.foreground }]}>{action}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask Nabd AI..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              multiline
              maxLength={500}
              accessibilityLabel="Message input"
              accessibilityHint="Type your question for Nabd AI"
            />
            <TouchableOpacity
              onPress={() => handleSend(inputText)}
              disabled={!inputText.trim() || isTyping}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: !inputText.trim() || isTyping }}
              style={[
                styles.sendButton,
                { backgroundColor: colors.primary, opacity: !inputText.trim() || isTyping ? 0.5 : 1 },
              ]}
            >
              <Feather name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerInfo: {
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
  },
  feed: {
    flex: 1,
  },
  messageWrapper: {
    marginBottom: 16,
    flexDirection: "row",
  },
  userWrapper: {
    justifyContent: "flex-end",
  },
  assistantWrapper: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  messageText: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    lineHeight: 22,
  },
  footer: {
    gap: 12,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
  },
  inputBar: {
    paddingHorizontal: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
});
