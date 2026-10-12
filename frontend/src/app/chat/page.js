'use client';

import React, { useCallback, useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { api, BACKEND_BASE_URL } from '../../utils/api';
import styles from './page.module.css';

function ChatContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search parameters for redirect creation
  const queryListingId = searchParams.get('listing_id');
  const queryOtherUserId = searchParams.get('other_user_id');

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [fetchingChats, setFetchingChats] = useState(true);

  const messagesEndRef = useRef(null);

  // Auto redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/chat');
    }
  }, [user, loading, router]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Refresh the inbox after messages are sent or while a conversation is open.
  const loadChatsList = useCallback(async () => {
    try {
      const chatData = await api.getChats();
      setChats(chatData);
    } catch (e) {
      console.error('Failed to load chats list', e);
    } finally {
      setFetchingChats(false);
    }
  }, []);

  // Initial load also resolves a deep link from an advertisement into the right thread.
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;

    const initialiseInbox = async () => {
      try {
        const chatData = await api.getChats();
        if (cancelled) return;
        setChats(chatData);

        if (queryListingId && queryOtherUserId) {
          const listingId = Number(queryListingId);
          const otherUserId = Number(queryOtherUserId);
          const existing = chatData.find(
            (chat) => Number(chat.listing_id) === listingId &&
              Number(chat.other_user_id) === otherUserId
          );

          if (existing) {
            setActiveChat(existing);
          } else {
            const listing = await api.getListingById(listingId);
            if (cancelled || !listing) return;
            setActiveChat({
              listing_id: listingId,
              listing_title: listing.title,
              listing_price: listing.price,
              listing_image: listing.image_url,
              other_user_id: otherUserId,
              other_user_name: listing.seller_name || 'Seller',
            });
          }
        }
      } catch (error) {
        if (!cancelled) console.error('Failed to initialise chat inbox', error);
      } finally {
        if (!cancelled) setFetchingChats(false);
      }
    };

    initialiseInbox();
    return () => {
      cancelled = true;
    };
  }, [user, queryListingId, queryOtherUserId]);

  // Load active messages thread
  useEffect(() => {
    if (!user || !activeChat) return;

    let isSubscribed = true;

    async function loadMessages() {
      try {
        const msgData = await api.getMessages(
          activeChat.listing_id,
          activeChat.other_user_id
        );
        if (isSubscribed) {
          setMessages(msgData);
        }
      } catch (e) {
        console.error('Failed to load messages thread', e);
      }
    }

    loadMessages();

    // Polling thread messages & chat list list updates every 3 seconds
    const interval = setInterval(() => {
      loadMessages();
      loadChatsList();
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [user, activeChat, loadChatsList]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeChat || !inputText.trim() || sending) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const newMsg = await api.sendMessage(
        activeChat.listing_id,
        activeChat.other_user_id,
        content
      );
      // Mark this as sent by the current authenticated user for immediate rendering,
      // including during deployments where an older backend is still running.
      const renderedNewMsg = { ...newMsg, is_mine: newMsg?.is_mine ?? 1 };
      // The poll can finish at the same time as send; de-duplicate by database id.
      setMessages((prev) => (
        prev.some((message) => Number(message.id) === Number(renderedNewMsg.id))
          ? prev
          : [...prev, renderedNewMsg]
      ));

      // If activeChat was a placeholder, re-fetch list to solidify it
      const inList = chats.some(
        (c) => c.listing_id === activeChat.listing_id && c.other_user_id === activeChat.other_user_id
      );
      if (!inList) {
        await loadChatsList();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send message: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url || url === '/placeholder-classified.svg') {
      return '/placeholder-classified.svg';
    }
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${BACKEND_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleImageError = (event) => {
    if (event.currentTarget.dataset.fallbackApplied === 'true') return;
    event.currentTarget.dataset.fallbackApplied = 'true';
    event.currentTarget.src = '/placeholder-classified.svg';
  };

  const formatMsgTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Prefer the backend's authenticated direction flag. The ID comparison is retained
  // as a compatibility fallback for messages from older API responses.
  const isMessageMine = (msg) => {
    if (msg?.is_mine !== undefined && msg?.is_mine !== null) {
      return msg.is_mine === true || msg.is_mine === 1 || msg.is_mine === '1';
    }

    const currentUserId = user?.id ?? user?.user_id ?? user?.userId;
    const senderId = msg?.sender_id ?? msg?.senderId ?? msg?.sender?.id;
    return currentUserId != null && senderId != null &&
      String(currentUserId).trim() === String(senderId).trim();
  };

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', width: '100%' }}>
        <div style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.container}>
        <div className={styles.chatLayout}>
          {/* 1. Sidebar Chats List */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>My Chats</div>

            <div className={styles.chatList}>
              {fetchingChats ? (
                <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>Loading conversations...</p>
              ) : chats.length === 0 && !activeChat ? (
                <div className={styles.noChats}>
                  No active conversations yet.
                </div>
              ) : (
                <>
                  {/* Render temporary active placeholder if not already in chats list */}
                  {activeChat && !chats.some(c => c.listing_id === activeChat.listing_id && c.other_user_id === activeChat.other_user_id) && (
                    <div
                      className={`${styles.chatItem} ${styles.activeItem}`}
                    >
                      <img
                        src={getImageUrl(activeChat.listing_image)}
                        alt={activeChat.listing_title || 'Listing'}
                        className={styles.itemImage}
                        onError={handleImageError}
                      />
                      <div className={styles.itemInfo}>
                        <div className={styles.itemName}>{activeChat.other_user_name}</div>
                        <div className={styles.itemTitle}>{activeChat.listing_title}</div>
                        <div className={styles.itemLastMsg} style={{ fontStyle: 'italic' }}>New chat starting...</div>
                      </div>
                    </div>
                  )}

                  {chats.map((c) => {
                    const isActive = activeChat &&
                      activeChat.listing_id === c.listing_id &&
                      activeChat.other_user_id === c.other_user_id;

                    return (
                      <div
                        key={`${c.listing_id}-${c.other_user_id}`}
                        onClick={() => setActiveChat(c)}
                        className={`${styles.chatItem} ${isActive ? styles.activeItem : ''}`}
                      >
                        <img
                          src={getImageUrl(c.listing_image)}
                          alt={c.listing_title || 'Listing'}
                          className={styles.itemImage}
                          onError={handleImageError}
                        />
                        <div className={styles.itemInfo}>
                          <div className={styles.itemName}>{c.other_user_name}</div>
                          <div className={styles.itemTitle}>{c.listing_title}</div>
                          <div className={styles.itemLastMsg}>{c.last_message}</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </aside>

          {/* 2. Main Chat Conversation Pane */}
          <main className={styles.mainPane}>
            {activeChat ? (
              <>
                {/* Active Chat Header */}
                <div className={styles.paneHeader}>
                  <div className={styles.headerDetail}>
                    <span className={styles.headerName}>{activeChat.other_user_name}</span>
                    <Link href={`/listing/${activeChat.listing_id}`} className={styles.headerItemTitle}>
                      Related Ad: {activeChat.listing_title} (Rs. {Number(activeChat.listing_price || 0).toLocaleString('en-IN')})
                    </Link>
                  </div>
                </div>

                {/* Messages Body */}
                <div className={styles.messageBody}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)', fontStyle: 'italic' }}>
                      Start your conversation! Type a message below and click send.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isSentByMe = isMessageMine(msg);

                      return (
                        <div
                          key={msg.id}
                          className={`${styles.msgRow} ${isSentByMe ? styles.msgSentRow : styles.msgReceivedRow}`}
                        >
                          <div className={`${styles.bubble} ${isSentByMe ? styles.bubbleSent : styles.bubbleReceived}`}>
                            {msg.content}
                            <span className={styles.timestamp}>
                              {formatMsgTime(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Footer */}
                <div className={styles.paneFooter}>
                  <form onSubmit={handleSendMessage} className={styles.inputForm}>
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className={styles.chatInput}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      required
                    />
                    <button type="submit" disabled={sending || !inputText.trim()} className={styles.sendButton}>
                      Send
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className={styles.welcomePane}>
                <div className={styles.welcomeIcon}>💬</div>
                <h3>Your Inbox</h3>
                <p style={{ marginTop: '8px' }}>Select a chat from the side menu to view messages and details.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', width: '100%' }}>
        <div style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
