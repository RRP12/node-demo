// Feed/cqrs/CommandBus.js - Command Bus for handling commands
const FollowStoreCommand = require("./commands/FollowStoreCommand")
const UpdatePreferencesCommand = require("./commands/UpdatePreferencesCommand")
const TrackUserActivityCommand = require("./commands/TrackUserActivityCommand")

class CommandBus {
  constructor() {
    this.commands = new Map()
    this.middleware = []
    this.eventHandlers = []
    
    // Register commands
    this.registerCommand("FollowStore", new FollowStoreCommand())
    this.registerCommand("UpdatePreferences", new UpdatePreferencesCommand())
    this.registerCommand("TrackUserActivity", new TrackUserActivityCommand())
  }

  /**
   * Register a command handler
   */
  registerCommand(commandName, commandHandler) {
    this.commands.set(commandName, commandHandler)
  }

  /**
   * Add middleware to command pipeline
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware)
  }

  /**
   * Add event handler for command events
   */
  addEventHandler(eventHandler) {
    this.eventHandlers.push(eventHandler)
  }

  /**
   * Execute a command
   * @param {String} commandName - Name of the command
   * @param {Object} payload - Command payload
   * @param {Object} context - Execution context (user, request info, etc.)
   * @returns {Object} - Command result
   */
  async execute(commandName, payload, context = {}) {
    const startTime = Date.now()
    
    try {
      // Get command handler
      const commandHandler = this.commands.get(commandName)
      if (!commandHandler) {
        throw new Error(`Command '${commandName}' not found`)
      }

      // Validate command payload
      const validation = commandHandler.validate(payload)
      if (!validation.isValid) {
        throw new Error(`Command validation failed: ${validation.errors.join(", ")}`)
      }

      // Execute middleware pipeline
      const enrichedPayload = await this.executeMiddleware(payload, context)

      // Execute command
      const result = await commandHandler.execute(enrichedPayload)

      // Add execution metadata
      result.executionTime = Date.now() - startTime
      result.commandName = commandName
      result.context = context

      // Emit events
      await this.emitEvents("command_executed", {
        commandName,
        payload: enrichedPayload,
        result,
        context
      })

      // Log command execution
      this.logCommandExecution(commandName, result, context)

      return result

    } catch (error) {
      const errorResult = {
        success: false,
        commandName,
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        context
      }

      // Emit error events
      await this.emitEvents("command_error", {
        commandName,
        payload,
        error: error.message,
        context
      })

      // Log error
      this.logCommandError(commandName, error, context)

      return errorResult
    }
  }

  /**
   * Execute middleware pipeline
   */
  async executeMiddleware(payload, context) {
    let enrichedPayload = { ...payload }

    for (const middleware of this.middleware) {
      enrichedPayload = await middleware(enrichedPayload, context)
    }

    return enrichedPayload
  }

  /**
   * Emit events to registered handlers
   */
  async emitEvents(eventType, eventData) {
    for (const handler of this.eventHandlers) {
      try {
        await handler(eventType, eventData)
      } catch (error) {
        console.error(`Event handler error for ${eventType}:`, error)
      }
    }
  }

  /**
   * Log command execution
   */
  logCommandExecution(commandName, result, context) {
    console.log(`[CommandBus] ${commandName} executed`, {
      success: result.success,
      executionTime: result.executionTime,
      commandId: result.commandId,
      userId: context.userId,
      timestamp: result.timestamp
    })
  }

  /**
   * Log command errors
   */
  logCommandError(commandName, error, context) {
    console.error(`[CommandBus] ${commandName} failed`, {
      error: error.message,
      userId: context.userId,
      timestamp: new Date()
    })
  }

  /**
   * Get list of registered commands
   */
  getRegisteredCommands() {
    return Array.from(this.commands.keys())
  }

  /**
   * Get command statistics
   */
  getStatistics() {
    return {
      registeredCommands: this.commands.size,
      middlewareCount: this.middleware.length,
      eventHandlerCount: this.eventHandlers.length
    }
  }
}

// Create singleton instance
const commandBus = new CommandBus()

// Add default middleware
commandBus.addMiddleware(async (payload, context) => {
  // Add timestamp to all commands
  return {
    ...payload,
    _timestamp: new Date(),
    _userId: context.userId
  }
})

// Add default event handler for analytics
commandBus.addEventHandler(async (eventType, eventData) => {
  if (eventType === "command_executed") {
    // Could send to analytics service
    // analytics.track('command_executed', eventData)
  }
})

module.exports = commandBus
