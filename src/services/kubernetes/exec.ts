import * as k8s from '@kubernetes/client-node';
import * as stream from 'stream';
import { getKubeConfigForContext } from './config';

// Execute a command in a pod
export const execInPod = async (
  contextName: string,
  namespace: string,
  podName: string,
  containerName: string,
  command: string[]
): Promise<{ output: string; error: string }> => {
  try {
    const kubeConfig = getKubeConfigForContext(contextName);
    const exec = new k8s.Exec(kubeConfig);
    
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';
      let commandExited = false; 

      const stdoutStream = new stream.Writable({
        write(chunk, encoding, callback) {
          output += chunk.toString();
          callback();
        }
      });

      const stderrStream = new stream.Writable({
        write(chunk, encoding, callback) {
          errorOutput += chunk.toString();
          callback();
        }
      });
      
      const statusCb = (status: k8s.V1Status) => {
        if (commandExited) return;
        if (status.status === 'Success') {
          commandExited = true;
          resolve({ output, error: errorOutput });
        } else if (status.status === 'Failure') {
          commandExited = true;
          const execError = new Error(status.message || `Command execution failed: ${status.reason}`);
          reject(execError);
        }
      };
      
      exec.exec(
        namespace,
        podName,
        containerName,
        command,
        stdoutStream, // Pass the custom Writable stream for stdout
        stderrStream, // Pass the custom Writable stream for stderr
        null,       // stdin: null for non-interactive
        false,      // tty
        statusCb    // Correctly typed status callback
      ).then((ws) => {
        // We need to define the event handlers but don't need to use the event objects
        ws.onclose = () => {
          if (!commandExited) {
            commandExited = true;
            // Resolve with whatever output/error was captured if WS closes before final V1Status
            resolve({ output, error: errorOutput });
          }
        };
        ws.onerror = () => {
          if (!commandExited) {
            commandExited = true;
            // Try to get more specific error from event if possible
            const err = new Error('WebSocket error during exec');
            // console.error("WebSocket error event:", errEvent); // For debugging
            reject(err);
          }
        };
      }).catch(err => {
        // Catch errors from the initial exec.exec() call (e.g., connection issues)
        if (!commandExited) {
          commandExited = true;
          reject(err);
        }
      });
    });
  } catch (error) {
    console.error(`Error executing command in pod ${podName}:`, error);
    throw error;
  }
}; 