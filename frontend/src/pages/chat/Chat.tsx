import { useRef, useState, useEffect, useContext, useLayoutEffect } from "react";
import { CommandBarButton, IconButton, Dialog, DialogType, Stack } from "@fluentui/react";
import { SquareRegular, ShieldLockRegular, ErrorCircleRegular, ArrowClockwise24Regular } from "@fluentui/react-icons";

import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm'
import rehypeRaw from "rehype-raw";
import uuid from 'react-uuid';

import styles from "./Chat.module.css";

import {
    ChatMessage,
    ConversationRequest,
    conversationApi,
    Citation,
    ToolMessageContent,
    ChatResponse,
    getUserInfo,
    Conversation,
    historyGenerate,
    historyUpdate,
    ChatHistoryLoadingState,
    CosmosDBStatus,
    ErrorMessage
} from "../../api";
import { Answer } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { ChatHistoryPanel } from "../../components/ChatHistory/ChatHistoryPanel";
import { AppStateContext } from "../../state/AppProvider";
import { useBoolean } from "@fluentui/react-hooks";
import Navigation from '../../components/Navigation/Navigation';
import PdfPage from "../pdf/PdfPage";
import styled from "styled-components";

const enum messageStatus {
    NotRunning = "Not Running",
    Processing = "Processing",
    Done = "Done"
}

interface DescriptionProps {
    size?: string;
    color?: string;
}

const Description = styled.p<DescriptionProps>`
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: ${(props) => props.size};
    color: ${(props) => props.color};
  `;

const Header = styled.header`
    display: flex;
    align-items: center;
    gap: 1.1em;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    padding-bottom: 1em;
    height: 3.2em;
    & img {
        height: 100%;
        border-radius: 0.7em;
    }
    & h2 {
        font-size: 0.85em;
        font-weight: 600;
    }
    @media (max-width: 820px) {
      height: 50px;
      margin: 5px;
      padding: 0px;
      gap: 0;
  }
`;


const Chat = () => {
    const appStateContext = useContext(AppStateContext)
    const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false);
    const [activeCitation, setActiveCitation] = useState<Citation>();
    const [isCitationPanelOpen, setIsCitationPanelOpen] = useState<boolean>(false);
    const abortFuncs = useRef([] as AbortController[]);
    const [showAuthMessage, setShowAuthMessage] = useState<boolean>(true);
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [processMessages, setProcessMessages] = useState<messageStatus>(messageStatus.NotRunning);
    const [clearingChat, setClearingChat] = useState<boolean>(false);
    const [hideErrorDialog, { toggle: toggleErrorDialog }] = useBoolean(true);
    const [errorMsg, setErrorMsg] = useState<ErrorMessage | null>();
    const [navValue, setnavValue] = useState<string>('Chat');

    const errorDialogContentProps = {
        type: DialogType.close,
        title: errorMsg?.title,
        closeButtonAriaLabel: 'Close',
        subText: errorMsg?.subtitle,
    };

    const modalProps = {
        titleAriaId: 'labelId',
        subtitleAriaId: 'subTextId',
        isBlocking: true,
        styles: { main: { maxWidth: 450 } },
    }
    
    const triggerPdfActivation = () => {
      const event = new Event("activatePdfButton");
      window.dispatchEvent(event);
    };

    useEffect(() => {
        if (appStateContext?.state.isCosmosDBAvailable?.status === CosmosDBStatus.NotWorking && appStateContext.state.chatHistoryLoadingState === ChatHistoryLoadingState.Fail && hideErrorDialog) {
            let subtitle = `${appStateContext.state.isCosmosDBAvailable.status}. Please contact the site administrator.`
            setErrorMsg({
                title: "Chat history is not enabled",
                subtitle: subtitle
            })
            toggleErrorDialog();
        }
    }, [appStateContext?.state.isCosmosDBAvailable]);

    const handleErrorDialogClose = () => {
        toggleErrorDialog()
        setTimeout(() => {
            setErrorMsg(null)
        }, 500);
    }

    const getUserInfoList = async () => {
        const userInfoList = await getUserInfo();
        if (userInfoList.length === 0 && window.location.hostname !== "127.0.0.1") {
            setShowAuthMessage(true);
        }
        else {
            setShowAuthMessage(false);
        }
    }

    const makeApiRequestWithoutCosmosDB = async (question: string, conversationId?: string) => {
        setIsLoading(true);
        setShowLoadingMessage(true);
        const abortController = new AbortController();
        abortFuncs.current.unshift(abortController);

        const userMessage: ChatMessage = {
            id: uuid(),
            role: "user",
            content: question,
            date: new Date().toISOString(),
        };

        let conversation: Conversation | null | undefined;
        if (!conversationId) {
            conversation = {
                id: conversationId ?? uuid(),
                title: question,
                messages: [userMessage],
                date: new Date().toISOString(),
            }
        } else {
            conversation = appStateContext?.state?.currentChat
            if (!conversation) {
                console.error("Conversation not found.");
                setIsLoading(false);
                setShowLoadingMessage(false);
                abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                return;
            } else {
                conversation.messages.push(userMessage);
            }
        }

        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation });
        setMessages(conversation.messages)

        const request: ConversationRequest = {
            messages: [...conversation.messages.filter((answer) => answer.role !== "error")]
            // messages: [...conversation.messages.filter((answer) => answer.role === "error")]
        };

        let result = {} as ChatResponse;
        try {
            const response = await conversationApi(request, abortController.signal);
            if (response?.body) {
                const reader = response.body.getReader();
                let runningText = "";

                while (true) {
                    setProcessMessages(messageStatus.Processing)
                    const { done, value } = await reader.read();
                    if (done) break;

                    var text = new TextDecoder("utf-8").decode(value);
                    const objects = text.split("\n");
                    objects.forEach((obj) => {
                        try {
                            runningText += obj;
                            result = JSON.parse(runningText);
                            result.choices[0].messages.forEach((obj) => {
                                obj.id = uuid();
                                obj.date = new Date().toISOString();
                            })
                            setShowLoadingMessage(false);
                            if(!conversationId){
                                setMessages([...messages, userMessage, ...result.choices[0].messages]);
                            }else{
                                setMessages([...messages, ...result.choices[0].messages]);
                            }
                            runningText = "";
                        }
                        catch { }
                    });
                }
                conversation.messages.push(...result.choices[0].messages)
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation });
                setMessages([...messages, ...result.choices[0].messages]);
            }

        } catch (e) {
            if (!abortController.signal.aborted) {
                let errorMessage = "An error occurred. Please try again. If the problem persists, please contact the site administrator.";
                if (result.error?.message) {
                    errorMessage = result.error.message;
                }
                else if (typeof result.error === "string") {
                    errorMessage = result.error;
                }
                let errorChatMsg: ChatMessage = {
                    id: uuid(),
                    role: "error",
                    content: errorMessage,
                    date: new Date().toISOString()
                }
                conversation.messages.push(errorChatMsg);
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: conversation });
                setMessages([...messages, errorChatMsg]);
            } else {
                setMessages([...messages, userMessage])
            }
        } finally {
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
            setProcessMessages(messageStatus.Done)
        }

        return abortController.abort();
    };

    const makeApiRequestWithCosmosDB = async (question: string, conversationId?: string) => {
        setIsLoading(true);
        setShowLoadingMessage(true);
        const abortController = new AbortController();
        abortFuncs.current.unshift(abortController);

        const userMessage: ChatMessage = {
            id: uuid(),
            role: "user",
            content: question,
            date: new Date().toISOString(),
        };

        //api call params set here (generate)
        let request: ConversationRequest;
        let conversation;
        if (conversationId) {
            conversation = appStateContext?.state?.chatHistory?.find((conv) => conv.id === conversationId)
            if (!conversation) {
                console.error("Conversation not found.");
                setIsLoading(false);
                setShowLoadingMessage(false);
                abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                return;
            } else {
                conversation.messages.push(userMessage);
                request = {
                    messages: [...conversation.messages.filter((answer) => answer.role !== "error")]
                };
            }
        } else {
            request = {
                messages: [userMessage].filter((answer) => answer.role !== "error")
            };
            setMessages(request.messages)
        }
        let result = {} as ChatResponse;
        try {
            const response = conversationId ? await historyGenerate(request, abortController.signal, conversationId) : await historyGenerate(request, abortController.signal);
            if (!response?.ok) {
                let errorChatMsg: ChatMessage = {
                    id: uuid(),
                    role: "error",
                    content: "There was an error generating a response. Chat history can't be saved at this time. If the problem persists, please contact the site administrator.",
                    date: new Date().toISOString()
                }
                let resultConversation;
                if (conversationId) {
                    resultConversation = appStateContext?.state?.chatHistory?.find((conv) => conv.id === conversationId)
                    if (!resultConversation) {
                        console.error("Conversation not found.");
                        setIsLoading(false);
                        setShowLoadingMessage(false);
                        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                        return;
                    }
                    resultConversation.messages.push(errorChatMsg);
                } else {
                    setMessages([...messages, userMessage, errorChatMsg])
                    setIsLoading(false);
                    setShowLoadingMessage(false);
                    abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                    return;
                }
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation });
                setMessages([...resultConversation.messages]);
                return;
            }
            if (response?.body) {
                const reader = response.body.getReader();
                let runningText = "";

                while (true) {
                    setProcessMessages(messageStatus.Processing)
                    const { done, value } = await reader.read();
                    if (done) break;

                    var text = new TextDecoder("utf-8").decode(value);
                    const objects = text.split("\n");
                    objects.forEach((obj) => {
                        try {
                            runningText += obj;
                            result = JSON.parse(runningText);
                            result.choices[0].messages.forEach((obj) => {
                                obj.id = uuid();
                                obj.date = new Date().toISOString();
                            })
                            setShowLoadingMessage(false);
                            if (!conversationId) {
                                setMessages([...messages, userMessage, ...result.choices[0].messages]);
                            } else {
                                setMessages([...messages, ...result.choices[0].messages]);
                            }
                            runningText = "";
                        }
                        catch { }
                    });
                }

                let resultConversation;
                if (conversationId) {
                    resultConversation = appStateContext?.state?.chatHistory?.find((conv) => conv.id === conversationId)
                    if (!resultConversation) {
                        console.error("Conversation not found.");
                        setIsLoading(false);
                        setShowLoadingMessage(false);
                        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                        return;
                    }
                    resultConversation.messages.push(...result.choices[0].messages);
                } else {
                    resultConversation = {
                        id: result.history_metadata.conversation_id,
                        title: result.history_metadata.title,
                        messages: [userMessage],
                        date: result.history_metadata.date
                    }
                    resultConversation.messages.push(...result.choices[0].messages);
                }
                if (!resultConversation) {
                    setIsLoading(false);
                    setShowLoadingMessage(false);
                    abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                    return;
                }
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation });
                setMessages([...messages, ...result.choices[0].messages]);
            }

        } catch (e) {
            if (!abortController.signal.aborted) {
                let errorMessage = "An error occurred. Please try again. If the problem persists, please contact the site administrator.";
                if (result.error?.message) {
                    errorMessage = result.error.message;
                }
                else if (typeof result.error === "string") {
                    errorMessage = result.error;
                }
                let errorChatMsg: ChatMessage = {
                    id: uuid(),
                    role: "error",
                    content: errorMessage,
                    date: new Date().toISOString()
                }
                let resultConversation;
                if (conversationId) {
                    resultConversation = appStateContext?.state?.chatHistory?.find((conv) => conv.id === conversationId)
                    if (!resultConversation) {
                        console.error("Conversation not found.");
                        setIsLoading(false);
                        setShowLoadingMessage(false);
                        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                        return;
                    }
                    resultConversation.messages.push(errorChatMsg);
                } else {
                    if (!result.history_metadata) {
                        console.error("Error retrieving data.", result);
                        setIsLoading(false);
                        setShowLoadingMessage(false);
                        abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                        return;
                    }
                    resultConversation = {
                        id: result.history_metadata.conversation_id,
                        title: result.history_metadata.title,
                        messages: [userMessage],
                        date: result.history_metadata.date
                    }
                    resultConversation.messages.push(errorChatMsg);
                }
                if (!resultConversation) {
                    setIsLoading(false);
                    setShowLoadingMessage(false);
                    abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
                    return;
                }
                appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: resultConversation });
                setMessages([...messages, errorChatMsg]);
            } else {
                setMessages([...messages, userMessage])
            }
        } finally {
            setIsLoading(false);
            setShowLoadingMessage(false);
            abortFuncs.current = abortFuncs.current.filter(a => a !== abortController);
            setProcessMessages(messageStatus.Done)
        }
        return abortController.abort();

    }

    const newChat = () => {
        setProcessMessages(messageStatus.Processing)
        setMessages([])
        setIsCitationPanelOpen(false);
        setActiveCitation(undefined);
        appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: null });
        setProcessMessages(messageStatus.Done)
    };

    const stopGenerating = () => {
        abortFuncs.current.forEach(a => a.abort());
        setShowLoadingMessage(false);
        setIsLoading(false);
    }

    useEffect(() => {
        if (appStateContext?.state.currentChat) {

            setMessages(appStateContext.state.currentChat.messages)
        } else {
            setMessages([])
        }
    }, [appStateContext?.state.currentChat]);

    useLayoutEffect(() => {
        const saveToDB = async (messages: ChatMessage[], id: string) => {
            const response = await historyUpdate(messages, id)
            return response
        }

        if (appStateContext && appStateContext.state.currentChat && processMessages === messageStatus.Done) {
            if (appStateContext.state.isCosmosDBAvailable.cosmosDB) {
                if (!appStateContext?.state.currentChat?.messages) {
                    console.error("Failure fetching current chat state.")
                    return
                }
                saveToDB(appStateContext.state.currentChat.messages, appStateContext.state.currentChat.id)
                    .then((res) => {
                        if (!res.ok) {
                            let errorMessage = "An error occurred. Answers can't be saved at this time. If the problem persists, please contact the site administrator.";
                            let errorChatMsg: ChatMessage = {
                                id: uuid(),
                                role: "error",
                                content: errorMessage,
                                date: new Date().toISOString()
                            }
                            if (!appStateContext?.state.currentChat?.messages) {
                                let err: Error = {
                                    ...new Error,
                                    message: "Failure fetching current chat state."
                                }
                                throw err
                            }
                            setMessages([...appStateContext?.state.currentChat?.messages, errorChatMsg])
                        }
                        return res as Response
                    })
                    .catch((err) => {
                        console.error("Error: ", err)
                        let errRes: Response = {
                            ...new Response,
                            ok: false,
                            status: 500,
                        }
                        return errRes;
                    })
            } else {
            }
            appStateContext?.dispatch({ type: 'UPDATE_CHAT_HISTORY', payload: appStateContext.state.currentChat });
            setMessages(appStateContext.state.currentChat.messages)
            setProcessMessages(messageStatus.NotRunning)
        }
    }, [processMessages]);

    useEffect(() => {
        getUserInfoList();
    }, []);

    useLayoutEffect(() => {
        chatMessageStreamEnd.current?.scrollIntoView({ behavior: "smooth" })
    }, [showLoadingMessage, processMessages]);

    const onShowCitation = (citation: Citation) => {
        setActiveCitation(citation);
        setIsCitationPanelOpen(true);
    };

    const onViewSource = (citation: Citation) => {
        if (citation.url && !citation.url.includes("blob.core")) {
            window.open(citation.url, "_blank");
        }
    };

    const parseCitationFromMessage = (message: ChatMessage) => {
        if (message?.role && message?.role === "tool") {
            try {
                const toolMessage = JSON.parse(message.content) as ToolMessageContent;
                return toolMessage.citations;
            }
            catch {
                return [];
            }
        }
        return [];
    }

    const disabledButton = () => {
        return isLoading || (messages && messages.length === 0) || clearingChat || appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading
    }
    const onNavClicked = (value: string) => {
        setnavValue(value);
        console.log(`Navigation clicked with value: ${value}`);
    };

    return (
      <div className={styles.container} role="main">
        {showAuthMessage ? (
          <Stack className={styles.chatEmptyState}>
            <ShieldLockRegular
              className={styles.chatIcon}
              style={{ color: "darkorange", height: "200px", width: "200px" }}
            />
            <h1 className={styles.chatEmptyStateTitle}>
              Authentication Not Configured
            </h1>
            <h2 className={styles.chatEmptyStateSubtitle}>
              This app does not have authentication configured. Please add an
              identity provider by finding your app in the
            </h2>
            <h2
              className={styles.chatEmptyStateSubtitle}
              style={{ fontSize: "20px" }}
            >
              <strong>
                Authentication configuration takes a few minutes to apply.{" "}
              </strong>
            </h2>
            <h2
              className={styles.chatEmptyStateSubtitle}
              style={{ fontSize: "20px" }}
            >
              <strong>
                If you deployed in the last 10 minutes, please wait and reload
                the page after 10 minutes.
              </strong>
            </h2>
          </Stack>
        ) : (
          <Stack horizontal className={styles.chatRoot}>
            <Navigation onNavClicked={onNavClicked} />
            <div
              style={{
                display: navValue === "Chat" || null ? "contents" : "none",
              }}
            >
              <div className={styles.chatContainer}>
                <Stack>
                  <Header>
                    <img
                      alt="room-img"
                      src={
                        "https://i.pinimg.com/originals/23/7e/7d/237e7dfccfe9c019bf148855aec83c11.gif"
                      }
                    />
                    <div>
                      <h2>{"Chat with The 10X Software Engineer"}</h2>
                      <Description color="#000" size="0.75em">
                        {
                          "Ask questions around various aspects of developer career growth."
                        }
                      </Description>
                    </div>
                  </Header>
                    {/* Citation Panel */}
                    {messages && messages.length > 0 && isCitationPanelOpen && activeCitation && ( 
                    <Stack.Item className={styles.citationPanel} tabIndex={0} role="tabpanel" aria-label="Citations Panel">
                        <Stack aria-label="Citations Panel Header Container" horizontal className={styles.citationPanelHeaderContainer} horizontalAlign="space-between" verticalAlign="center">
                            <span aria-label="Citations" className={styles.citationPanelHeader}>Citations</span>
                            <IconButton iconProps={{ iconName: 'Cancel'}} aria-label="Close citations panel" onClick={() => setIsCitationPanelOpen(false)}/>
                        </Stack>
                        <h5 className={styles.citationPanelTitle} tabIndex={0} title={activeCitation.url && !activeCitation.url.includes("blob.core") ? activeCitation.url : activeCitation.title ?? ""} onClick={() => onViewSource(activeCitation)}>{activeCitation.title}</h5>
                        <div tabIndex={0}> 
                        <ReactMarkdown 
                            linkTarget="_blank"
                            className={styles.citationPanelContent}
                            children={activeCitation.content} 
                            remarkPlugins={[remarkGfm]} 
                            rehypePlugins={[rehypeRaw]}
                        />
                        </div>
                    </Stack.Item>
                )}
                {(appStateContext?.state.isChatHistoryOpen && appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured) && <ChatHistoryPanel/>}
                </Stack>
                {!messages || messages.length < 1 ? (
                  <Stack className={styles.chatEmptyState}>
                    <h1 className={styles.chatEmptyStateTitle}>
                      The 10x Software Engineer
                    </h1>
                    <h2 className={styles.chatEmptyStateSubtitle}>
                      I'm here to answer your questions about
                      my book (with citations).
                    </h2>
                    <h2
                      onClick={triggerPdfActivation}
                      className={styles.clickable + " " + styles.chatEmptyStateSubtitle}
                    >
                      Table of Contents
                    </h2>
                  </Stack>
                ) : (
                  <div
                    className={styles.chatMessageStream}
                    style={{ marginBottom: isLoading ? "40px" : "0px" }}
                    role="log"
                  >
                    {messages.map((answer, index) => (
                      <>
                        {answer.role === "user" ? (
                          <div className={styles.chatMessageUser} tabIndex={0}>
                            <div className={styles.chatMessageUserMessage}>
                              {answer.content}
                            </div>
                          </div>
                        ) : answer.role === "assistant" ? (
                          <div className={styles.chatMessageGpt}>
                            <Answer
                              answer={{
                                answer: answer.content,
                                citations: parseCitationFromMessage(
                                  messages[index - 1]
                                ),
                              }}
                              onCitationClicked={(c) => onShowCitation(c)}
                            />
                          </div>
                        ) : answer.role === "error" ? (
                          <div className={styles.chatMessageError}>
                            <Stack
                              horizontal
                              className={styles.chatMessageErrorContent}
                            >
                              <ErrorCircleRegular
                                className={styles.errorIcon}
                                style={{ color: "rgba(182, 52, 67, 1)" }}
                              />
                              <span>Error</span>
                            </Stack>
                            <span className={styles.chatMessageErrorContent}>
                              {answer.content}
                            </span>
                          </div>
                        ) : null}
                      </>
                    ))}
                    {showLoadingMessage && (
                      <>
                        <div className={styles.chatMessageGpt}>
                          <Answer
                            answer={{
                              answer: "Generating answer...",
                              citations: [],
                            }}
                            onCitationClicked={() => null}
                          />
                        </div>
                      </>
                    )}
                    <div ref={chatMessageStreamEnd} />
                  </div>
                )}

                <Stack horizontal className={styles.chatInput}>
                  {isLoading && (
                    <Stack
                      horizontal
                      className={styles.stopGeneratingContainer}
                      role="button"
                      aria-label="Stop"
                      tabIndex={0}
                      onClick={stopGenerating}
                      onKeyDown={(e) =>
                        e.key === "Enter" || e.key === " "
                          ? stopGenerating()
                          : null
                      }
                    >
                      <SquareRegular className={styles.stopGeneratingIcon} />
                      <span
                        className={styles.stopGeneratingText}
                        aria-hidden="true"
                      >
                        Stop
                      </span>
                    </Stack>
                  )}
                  <Stack>
                  <div className={styles.chatIcon01}>
                    {appStateContext?.state.isCosmosDBAvailable?.status !==
                      CosmosDBStatus.NotConfigured && (
                        <CommandBarButton
                          role="button"
                          styles={{
                            icon: {
                              color: "#FFFFFF",
                            },
                            root: {
                              color: "#FFFFFF",
                              background:
                                "radial-gradient(109.81% 107.82% at 100.1% 90.19%, #0F6CBD 33.63%, #2D87C3 70.31%, #8DDDD8 100%)",
                            },
                            rootDisabled: {
                              background: "#BDBDBD",
                            },
                          }}
                          className={styles.newChatIcon}
                          iconProps={{ iconName: "Refresh" }}
                          onClick={newChat}
                          disabled={disabledButton()}
                          aria-label="start a new chat button"
                        />
                      )}
                  </div>

                    <Dialog
                      hidden={hideErrorDialog}
                      onDismiss={handleErrorDialogClose}
                      dialogContentProps={errorDialogContentProps}
                      modalProps={modalProps}
                    ></Dialog>
                  </Stack>
                  <QuestionInput
                    clearOnSend
                    placeholder="Type a new question..."
                    disabled={isLoading}
                    onSend={(question, id) => {
                      appStateContext?.state.isCosmosDBAvailable?.cosmosDB
                        ? makeApiRequestWithCosmosDB(question, id)
                        : makeApiRequestWithoutCosmosDB(question, id);
                    }}
                    conversationId={
                      appStateContext?.state.currentChat?.id
                        ? appStateContext?.state.currentChat?.id
                        : undefined
                    }
                  />
                </Stack>
              </div>
              {messages &&
                messages.length > 0 &&
                isCitationPanelOpen &&
                activeCitation && (
                  <Stack.Item
                    className={styles.citationPanel}
                    tabIndex={0}
                    role="tabpanel"
                    aria-label="Citations Panel"
                  >
                    <Stack
                      aria-label="Citations Panel Header Container"
                      horizontal
                      className={styles.citationPanelHeaderContainer}
                      horizontalAlign="space-between"
                      verticalAlign="center"
                    >
                      <span
                        aria-label="Citations"
                        className={styles.citationPanelHeader}
                       >
                        Citations from the book
                      </span>
                      <IconButton
                        className={styles.citationPanelCloseIcon}
                        iconProps={{ iconName: "Cancel" }}
                        aria-label="Close citations panel"
                        onClick={() => setIsCitationPanelOpen(false)}
                      />
                    </Stack>
                    <h5 className={styles.citationPanelTitle} tabIndex={0}>
                      {activeCitation.title}
                    </h5>
                    <div tabIndex={0}>
                      <ReactMarkdown
                        linkTarget="_blank"
                        className={styles.citationPanelContent}
                        children={activeCitation.content}
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                      />
                    </div>
                  </Stack.Item>
                )}
            </div>
            {appStateContext?.state.isChatHistoryOpen &&
              appStateContext?.state.isCosmosDBAvailable?.status !==
                CosmosDBStatus.NotConfigured && <ChatHistoryPanel />}
            <div style={{ display: navValue === "pdf" ? "contents" : "none" }}>
              {navValue === "pdf" && <PdfPage />}
            </div>
          </Stack>
        )}
      </div>
    );
};

export default Chat;
