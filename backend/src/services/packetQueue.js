const EventEmitter = require('events');
const logger = require('../utils/logger');
const packetProcessor = require('./packetProcessor');

class PacketQueue extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.queue = [];
        this.processing = new Map();
        this.maxConcurrency = options.maxConcurrency || 10;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.maxQueueSize = options.maxQueueSize || 1000;
        
        this.stats = {
            totalQueued: 0,
            totalProcessed: 0,
            totalFailed: 0,
            totalRetries: 0
        };
        
        this.isRunning = false;
        this.workerPool = [];
        
        // Use the packet processor instance
        this.packetProcessor = packetProcessor;
        
        this.start();
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.processQueue();
        
        logger.info('Packet queue started', {
            maxConcurrency: this.maxConcurrency,
            maxRetries: this.maxRetries,
            maxQueueSize: this.maxQueueSize
        });
    }
    
    stop() {
        this.isRunning = false;
        logger.info('Packet queue stopped');
    }
    
    async add(packet, metadata = {}) {
        const queueItem = {
            id: this.generateId(),
            packet,
            metadata,
            retries: 0,
            timestamp: new Date(),
            priority: metadata.priority || 0
        };
        
        // Check queue size limit
        if (this.queue.length >= this.maxQueueSize) {
            logger.warn('Packet queue full, dropping oldest item', {
                queueSize: this.queue.length,
                maxQueueSize: this.maxQueueSize
            });
            this.queue.shift(); // Remove oldest item
        }
        
        this.queue.push(queueItem);
        this.stats.totalQueued++;
        
        this.emit('queued', queueItem);
        
        // Start processing if not already running
        if (!this.isRunning) {
            this.start();
        }
        
        return queueItem.id;
    }
    
    async processQueue() {
        while (this.isRunning) {
            try {
                // Wait if at max concurrency
                if (this.processing.size >= this.maxConcurrency) {
                    await this.sleep(100);
                    continue;
                }
                
                // Get next item from queue
                const item = this.queue.shift();
                if (!item) {
                    await this.sleep(100);
                    continue;
                }
                
                // Process item
                this.processItem(item);
                
            } catch (error) {
                logger.error('Error in packet queue processing', { error: error.message });
                await this.sleep(1000);
            }
        }
    }
    
    async processItem(item) {
        this.processing.set(item.id, item);
        
        try {
            const startTime = Date.now();
            
            // Process the packet
            await this.processPacket(item.packet, item.metadata);
            
            const processingTime = Date.now() - startTime;
            
            this.stats.totalProcessed++;
            this.processing.delete(item.id);
            
            this.emit('processed', item, processingTime);
            
            logger.debug('Packet processed successfully', {
                packetId: item.id,
                processingTime,
                queueSize: this.queue.length,
                processingCount: this.processing.size
            });
            
        } catch (error) {
            this.handleProcessingError(item, error);
        }
    }
    
    async processPacket(packet, metadata) {
        try {
            logger.info('Starting packet processing', {
                packetType: metadata.packetType,
                packetLength: packet.length,
                address: metadata.address
            });
            
            // Use the packetProcessor service instead of direct parser
            const processedData = await this.packetProcessor.processPacket(packet, metadata.socket);
            
            if (processedData) {
                logger.info('Packet processed successfully', {
                    packetType: metadata.packetType,
                    deviceId: processedData.deviceId,
                    dataKeys: Object.keys(processedData.data || {}),
                    address: metadata.address
                });
                
                // Emit event for real-time updates
                this.emit('recordStored', processedData);
            } else {
                logger.warn('No data returned from packet processing', {
                    packetType: metadata.packetType,
                    address: metadata.address
                });
            }
            
            return processedData;
        } catch (error) {
            logger.error('Error processing packet:', {
                error: error.message,
                errorStack: error.stack,
                metadata,
                packetLength: packet.length
            });
            throw error;
        }
    }
    

    
    handleProcessingError(item, error) {
        item.retries++;
        
        if (item.retries <= this.maxRetries) {
            // Retry the item
            this.stats.totalRetries++;
            
            logger.warn('Packet processing failed, retrying', {
                packetId: item.id,
                retry: item.retries,
                maxRetries: this.maxRetries,
                error: error.message
            });
            
            // Add back to queue with delay
            setTimeout(() => {
                this.queue.unshift(item); // Add to front of queue for retry
            }, this.retryDelay * item.retries);
            
        } else {
            // Max retries exceeded, mark as failed
            this.stats.totalFailed++;
            this.processing.delete(item.id);
            
            logger.error('Packet processing failed permanently', {
                packetId: item.id,
                retries: item.retries,
                error: error.message
            });
            
            this.emit('failed', item, error);
        }
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getStats() {
        return {
            queueSize: this.queue.length,
            processingCount: this.processing.size,
            isRunning: this.isRunning,
            maxConcurrency: this.maxConcurrency,
            ...this.stats
        };
    }
    
    clear() {
        this.queue = [];
        this.processing.clear();
        this.stats = {
            totalQueued: 0,
            totalProcessed: 0,
            totalFailed: 0,
            totalRetries: 0
        };
        
        logger.info('Packet queue cleared');
    }
    
    // Get queue status for monitoring
    getStatus() {
        return {
            queueSize: this.queue.length,
            processingCount: this.processing.size,
            isRunning: this.isRunning,
            stats: this.stats
        };
    }
}

// Create and export singleton instance
const packetQueue = new PacketQueue();

module.exports = packetQueue; 