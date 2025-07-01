from prometheus_client import Counter, Histogram
# from opentelemetry import trace  # Uncomment if OpenTelemetry is installed

# Prometheus metrics
agent_task_duration = Histogram('agent_task_duration_seconds', 'Duration of agent tasks', ['agent'])
agent_errors_total = Counter('agent_errors_total', 'Total agent errors', ['agent'])

# TODO: Add more metrics as needed

def record_task_duration(agent, duration):
    agent_task_duration.labels(agent=agent).observe(duration)

def increment_error(agent):
    agent_errors_total.labels(agent=agent).inc()

# OpenTelemetry tracing (stub)
def start_trace_span(name):
    # TODO: Integrate with OpenTelemetry tracer
    # tracer = trace.get_tracer(__name__)
    # with tracer.start_as_current_span(name):
    #     yield
    pass 