"use client";
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
	Mic,
	MicOff,
	Trash2,
	Download,
	Clock,
	Volume2,
	AlertCircle,
	CheckCircle2,
} from "lucide-react";

const SpeechTranscriptionApp = () => {
	const [isConnected, setIsConnected] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [transcripts, setTranscripts] = useState([]);
	const [partialTranscripts, setPartialTranscripts] = useState({});
	const [speakerColors, setSpeakerColors] = useState({});
	const [endpointEvents, setEndpointEvents] = useState([]);
	const [stats, setStats] = useState({
		totalWords: 0,
		avgConfidence: 0,
		sessionDuration: 0,
	});
	const eventSourceRef = useRef(null);
	const scrollAreaRef = useRef(null);
	const sessionStartRef = useRef(null);

	// Color palette for different speakers
	const colors = [
		"bg-blue-100 text-blue-800 border-blue-200",
		"bg-green-100 text-green-800 border-green-200",
		"bg-purple-100 text-purple-800 border-purple-200",
		"bg-orange-100 text-orange-800 border-orange-200",
		"bg-pink-100 text-pink-800 border-pink-200",
		"bg-cyan-100 text-cyan-800 border-cyan-200",
	];

	const assignSpeakerColor = (speaker) => {
		if (!speakerColors[speaker]) {
			const colorIndex = Object.keys(speakerColors).length % colors.length;
			setSpeakerColors((prev) => ({
				...prev,
				[speaker]: colors[colorIndex],
			}));
		}
	};

	const getConfidenceColor = (confidence) => {
		if (confidence >= 0.8) return "text-green-600";
		if (confidence >= 0.6) return "text-yellow-600";
		return "text-red-600";
	};

	const getConfidenceIcon = (confidence) => {
		if (confidence >= 0.8) return <CheckCircle2 className="w-3 h-3" />;
		if (confidence >= 0.6) return <AlertCircle className="w-3 h-3" />;
		return <AlertCircle className="w-3 h-3" />;
	};

	const formatTime = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const cleanTranscriptText = (text) => {
		if (!text) return text;
		return text
			.replace(/<end>/g, "")
			.replace(/<start>/g, "")
			.trim();
	};

	const updateStats = () => {
		if (transcripts.length > 0) {
			const totalWords = transcripts.reduce(
				(sum, t) => sum + (t.word_count || t.text.split(" ").length),
				0
			);
			const totalConfidence = transcripts.reduce(
				(sum, t) => sum + (t.confidence || 0),
				0
			);
			const avgConfidence = totalConfidence / transcripts.length;
			const sessionDuration = sessionStartRef.current
				? (Date.now() - sessionStartRef.current) / 1000
				: 0;

			setStats({
				totalWords,
				avgConfidence: avgConfidence * 100,
				sessionDuration,
			});
		}
	};

	const connectToTranscription = () => {
		if (isConnected) return;

		setIsLoading(true);
		setError("");
		sessionStartRef.current = Date.now();

		try {
			eventSourceRef.current = new EventSource(
				"http://localhost:8000/transcribe"
			);

			eventSourceRef.current.onopen = () => {
				setIsConnected(true);
				setIsLoading(false);
				setError("");
			};

			eventSourceRef.current.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					switch (data.type) {
						case "transcript":
							if (data.status !== "final") {
								// Partial transcript - update in real-time
								setPartialTranscripts((prev) => ({
									...prev,
									[data.speaker]: {
										text: data.partial_text || data.text,
										confidence: data.confidence,
										timestamp: new Date().toLocaleString(),
									},
								}));
							}
							break;

						case "segment":
							// Aggregated segment - this is the clean final output
							assignSpeakerColor(data.speaker);
							const segmentTranscript = {
								id: Date.now() + Math.random(),
								speaker: data.speaker,
								text: data.text,
								confidence: data.confidence,
								start_time: data.start_time,
								end_time: data.end_time,
								duration: data.duration,
								timestamp: new Date().toLocaleString(),
								is_final: true,
								word_count: data.word_count,
								type: "segment",
							};
							setTranscripts((prev) => [...prev, segmentTranscript]);

							// Clear partial transcript for this speaker
							setPartialTranscripts((prev) => {
								const updated = { ...prev };
								delete updated[data.speaker];
								return updated;
							});
							break;

						case "endpoint":
							const endpointEvent = {
								id: Date.now() + Math.random(),
								event: data.event,
								timestamp: new Date().toLocaleString(),
								time: data.timestamp,
							};
							setEndpointEvents((prev) => [...prev.slice(-4), endpointEvent]); // Keep last 5 events
							break;

						case "heartbeat":
							// Keep connection alive, maybe update a status indicator
							break;

						case "error":
							setError(`Transcription error: ${data.message}`);
							break;

						default:
							// Handle legacy format for backward compatibility
							const match = event.data.match(/^Speaker (\d+): (.+)$/);
							if (match) {
								const speaker = match[1];
								const text = match[2];
								assignSpeakerColor(speaker);

								const legacyTranscript = {
									id: Date.now() + Math.random(),
									speaker,
									text,
									confidence: 1.0, // Default confidence for legacy format
									timestamp: new Date().toLocaleString(),
									is_final: true,
									word_count: text.split(" ").length,
								};
								setTranscripts((prev) => [...prev, legacyTranscript]);
							}
					}
				} catch (parseError) {
					// Handle non-JSON messages (legacy format)
					const data = event.data;
					if (data && data.startsWith("Speaker")) {
						const match = data.match(/^Speaker (\d+): (.+)$/);
						if (match) {
							const speaker = match[1];
							const text = match[2];
							assignSpeakerColor(speaker);

							const legacyTranscript = {
								id: Date.now() + Math.random(),
								speaker,
								text,
								confidence: 1.0,
								timestamp: new Date().toLocaleString(),
								is_final: true,
								word_count: text.split(" ").length,
							};
							setTranscripts((prev) => [...prev, legacyTranscript]);
						}
					}
				}
			};

			eventSourceRef.current.onerror = (event) => {
				setError(
					"Failed to connect to transcription service. Make sure your API server is running on localhost:8000"
				);
				setIsConnected(false);
				setIsLoading(false);
				if (eventSourceRef.current) {
					eventSourceRef.current.close();
				}
			};
		} catch (err) {
			setError("Error starting transcription: " + err.message);
			setIsLoading(false);
		}
	};

	const disconnectFromTranscription = () => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}
		setIsConnected(false);
		setIsLoading(false);
		setPartialTranscripts({});
	};

	const clearTranscripts = () => {
		setTranscripts([]);
		setPartialTranscripts({});
		setSpeakerColors({});
		setEndpointEvents([]);
		setStats({ totalWords: 0, avgConfidence: 0, sessionDuration: 0 });
	};

	const exportTranscripts = () => {
		const text = transcripts
			.map(
				(t) =>
					`[${t.timestamp}] Speaker ${t.speaker} (${(
						t.confidence * 100
					).toFixed(1)}% confidence, ${t.duration?.toFixed(2)}s): ${t.text}`
			)
			.join("\n");
		const blob = new Blob([text], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `transcription-enhanced-${
			new Date().toISOString().split("T")[0]
		}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	// Auto-scroll to bottom when new transcripts arrive
	useEffect(() => {
		if (scrollAreaRef.current) {
			const scrollContainer = scrollAreaRef.current.querySelector(
				"[data-radix-scroll-area-viewport]"
			);
			if (scrollContainer) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
		}
	}, [transcripts, partialTranscripts]);

	// Update stats periodically
	useEffect(() => {
		const interval = setInterval(updateStats, 1000);
		return () => clearInterval(interval);
	}, [transcripts]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
			}
		};
	}, []);

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
			<div className="max-w-6xl mx-auto space-y-6">
				{/* Header */}
				<div className="text-center space-y-2">
					<h1 className="text-3xl font-bold text-slate-800">
						Enhanced Live Speech Transcription
					</h1>
					<p className="text-slate-600">
						Real-time speech-to-text with timestamps, confidence scores &
						endpoint detection
					</p>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<Card>
						<CardContent className="p-4">
							<div className="flex items-center gap-2">
								<Volume2 className="w-4 h-4 text-blue-600" />
								<div>
									<p className="text-sm text-slate-600">Total Words</p>
									<p className="text-xl font-bold">{stats.totalWords}</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-4">
							<div className="flex items-center gap-2">
								<CheckCircle2 className="w-4 h-4 text-green-600" />
								<div>
									<p className="text-sm text-slate-600">Avg Confidence</p>
									<p className="text-xl font-bold">
										{stats.avgConfidence.toFixed(1)}%
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-4">
							<div className="flex items-center gap-2">
								<Clock className="w-4 h-4 text-purple-600" />
								<div>
									<p className="text-sm text-slate-600">Session Time</p>
									<p className="text-xl font-bold">
										{formatTime(stats.sessionDuration)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="p-4">
							<div className="flex items-center gap-2">
								<Mic className="w-4 h-4 text-orange-600" />
								<div>
									<p className="text-sm text-slate-600">Speakers</p>
									<p className="text-xl font-bold">
										{Object.keys(speakerColors).length}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Controls */}
				<Card>
					<CardContent className="p-6">
						<div className="flex flex-wrap items-center justify-between gap-4">
							<div className="flex items-center gap-4">
								<Button
									onClick={
										isConnected
											? disconnectFromTranscription
											: connectToTranscription
									}
									disabled={isLoading}
									className={`flex items-center gap-2 ${
										isConnected
											? "bg-red-600 hover:bg-red-700"
											: "bg-green-600 hover:bg-green-700"
									}`}
								>
									{isLoading ? (
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									) : isConnected ? (
										<MicOff className="w-4 h-4" />
									) : (
										<Mic className="w-4 h-4" />
									)}
									{isLoading
										? "Connecting..."
										: isConnected
										? "Stop Transcription"
										: "Start Transcription"}
								</Button>

								<div className="flex items-center gap-2">
									<div
										className={`w-3 h-3 rounded-full ${
											isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
										}`}
									/>
									<span className="text-sm text-slate-600">
										{isConnected ? "Connected" : "Disconnected"}
									</span>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={clearTranscripts}
									disabled={transcripts.length === 0}
									className="flex items-center gap-2"
								>
									<Trash2 className="w-4 h-4" />
									Clear
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={exportTranscripts}
									disabled={transcripts.length === 0}
									className="flex items-center gap-2"
								>
									<Download className="w-4 h-4" />
									Export
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Error Alert */}
				{error && (
					<Alert className="border-red-200 bg-red-50">
						<AlertDescription className="text-red-800">
							{error}
						</AlertDescription>
					</Alert>
				)}

				{/* Endpoint Events */}
				{endpointEvents.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Recent Endpoint Events</CardTitle>
						</CardHeader>
						<CardContent className="p-4">
							<div className="flex flex-wrap gap-2">
								{endpointEvents.map((event) => (
									<Badge key={event.id} variant="outline" className="text-xs">
										{event.event} at {event.timestamp}
									</Badge>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Transcription Display */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							Live Transcription
							<Badge variant="secondary" className="text-xs">
								{transcripts.length} messages
							</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ScrollArea
							ref={scrollAreaRef}
							className="h-96 w-full rounded-md border p-4"
						>
							{transcripts.length === 0 &&
							Object.keys(partialTranscripts).length === 0 ? (
								<div className="flex items-center justify-center h-full text-slate-500">
									{isConnected ? (
										<div className="text-center space-y-2">
											<Mic className="w-8 h-8 mx-auto text-slate-400" />
											<p>Listening for speech...</p>
											<p className="text-xs">
												Enhanced with timestamps, confidence scores & custom
												vocabulary
											</p>
										</div>
									) : (
										<div className="text-center space-y-2">
											<MicOff className="w-8 h-8 mx-auto text-slate-400" />
											<p>Click "Start Transcription" to begin</p>
											<p className="text-xs">
												Features: Timestamps • Confidence • Custom Vocabulary •
												Endpoint Detection
											</p>
										</div>
									)}
								</div>
							) : (
								<div className="space-y-3">
									{/* Conversation-style display */}
									{(() => {
										// Group consecutive transcripts by speaker to create conversation turns
										const conversationTurns = [];
										const finalTranscripts = transcripts.filter(
											(t) => t.type === "segment"
										);

										// Group consecutive transcripts by speaker
										for (let i = 0; i < finalTranscripts.length; i++) {
											const transcript = finalTranscripts[i];
											const lastTurn =
												conversationTurns[conversationTurns.length - 1];

											if (lastTurn && lastTurn.speaker === transcript.speaker) {
												// Same speaker - add to current turn
												lastTurn.texts.push(
													cleanTranscriptText(transcript.text)
												);
												lastTurn.confidences.push(transcript.confidence);
												lastTurn.endTime = transcript.end_time;
												lastTurn.lastTimestamp = transcript.timestamp;
											} else {
												// New speaker - create new turn
												conversationTurns.push({
													speaker: transcript.speaker,
													texts: [cleanTranscriptText(transcript.text)],
													confidences: [transcript.confidence],
													startTime: transcript.start_time,
													endTime: transcript.end_time,
													firstTimestamp: transcript.timestamp,
													lastTimestamp: transcript.timestamp,
													id: `turn-${transcript.speaker}-${i}`,
												});
											}
										}

										return (
											<div className="space-y-2">
												{/* Show conversation turns */}
												{conversationTurns.map((turn) => {
													const avgConfidence =
														turn.confidences.reduce(
															(sum, conf) => sum + conf,
															0
														) / turn.confidences.length;
													const combinedText = turn.texts
														.join(". ")
														.replace(/\.\./g, ".");

													return (
														<div key={turn.id} className="group">
															<div className="flex items-start gap-3">
																<Badge
																	className={`${
																		speakerColors[turn.speaker]
																	} shrink-0 font-mono text-xs`}
																>
																	Speaker {turn.speaker}
																</Badge>
																<div className="flex-1 min-w-0">
																	<p className="text-slate-800 leading-relaxed break-words">
																		{combinedText}
																	</p>
																	<div className="flex items-center gap-3 text-xs text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
																		{avgConfidence && (
																			<div className="flex items-center gap-1">
																				{getConfidenceIcon(avgConfidence)}
																				<span
																					className={getConfidenceColor(
																						avgConfidence
																					)}
																				>
																					{(avgConfidence * 100).toFixed(0)}%
																				</span>
																			</div>
																		)}
																		<span>{turn.lastTimestamp}</span>
																		{/* {turn.startTime !== undefined && turn.endTime !== undefined && (
																			<span>
																				{turn.startTime.toFixed(1)}s - {turn.endTime.toFixed(1)}s
																			</span>
																		)} */}
																	</div>
																</div>
															</div>
														</div>
													);
												})}
												{/* Show active partial transcripts
												{Object.entries(partialTranscripts).map(
													([speaker, partial]) => (
														<div
															key={`partial-${speaker}`}
															className="group opacity-70"
														>
															<div className="flex items-start gap-3">
																<Badge
																	className={`${speakerColors[speaker]} shrink-0 font-mono text-xs`}
																>
																	Speaker {speaker}
																</Badge>
																<div className="flex-1 min-w-0">
																	<p className="text-slate-600 leading-relaxed break-words italic">
																		{cleanTranscriptText(partial.text)}...
																	</p>
																	<div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
																		<span className="text-yellow-600 font-medium">
																			Partial
																		</span>
																		{partial.confidence && (
																			<div className="flex items-center gap-1">
																				{getConfidenceIcon(partial.confidence)}
																				<span
																					className={getConfidenceColor(
																						partial.confidence
																					)}
																				>
																					{(partial.confidence * 100).toFixed(
																						0
																					)}
																					%
																				</span>
																			</div>
																		)}
																		<span>{partial.timestamp}</span>
																	</div>
																</div>
															</div>
														</div>
													)
												)} */}
											</div>
										);
									})()}
								</div>
							)}
						</ScrollArea>
					</CardContent>
				</Card>

				{/* Enhanced Instructions */}
				<Card>
					<CardContent className="p-4">
						<div className="text-sm text-slate-600 space-y-3">
							<p>
								<strong>Enhanced Features:</strong>
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<ul className="list-disc list-inside space-y-1 ml-2">
									<li>
										<strong>Real-time Display:</strong> See partial transcripts
										as you speak
									</li>
									<li>
										<strong>Confidence Scores:</strong> Visual indicators for
										transcription accuracy
									</li>
									<li>
										<strong>Timestamps:</strong> Precise timing for each speech
										segment
									</li>
									<li>
										<strong>Custom Vocabulary:</strong> Enhanced recognition for
										"Titian System Solution"
									</li>
								</ul>
								<ul className="list-disc list-inside space-y-1 ml-2">
									<li>
										<strong>Endpoint Detection:</strong> Automatic speech
										start/end detection
									</li>
									<li>
										<strong>Low Latency:</strong> ~1 second maximum delay
									</li>
									<li>
										<strong>Speaker Tracking:</strong> Improved speaker
										diarization
									</li>
									<li>
										<strong>Session Stats:</strong> Word count and confidence
										metrics
									</li>
								</ul>
							</div>

							<div className="mt-4 p-3 bg-blue-50 rounded-lg">
								<p className="text-sm">
									<strong>Custom Terms Optimized:</strong>
								</p>
								<div className="flex flex-wrap gap-2 mt-2">
									<Badge variant="outline">Titian System Solution</Badge>
									<Badge variant="outline">Titian</Badge>
									<Badge variant="outline">SI</Badge>
									<Badge variant="outline">API</Badge>
									<Badge variant="outline">sistem</Badge>
									<Badge variant="outline">penyelesaian</Badge>
								</div>
							</div>

							<div className="mt-4 p-3 bg-green-50 rounded-lg">
								<p className="text-sm">
									<strong>Confidence Legend:</strong>
								</p>
								<div className="flex items-center gap-4 mt-2 text-xs">
									<div className="flex items-center gap-1">
										<CheckCircle2 className="w-3 h-3 text-green-600" />
										<span>High (80%+)</span>
									</div>
									<div className="flex items-center gap-1">
										<AlertCircle className="w-3 h-3 text-yellow-600" />
										<span>Medium (60-79%)</span>
									</div>
									<div className="flex items-center gap-1">
										<AlertCircle className="w-3 h-3 text-red-600" />
										<span>Low (&lt;60%)</span>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default SpeechTranscriptionApp;
