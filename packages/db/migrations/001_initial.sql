CREATE TABLE products (
  id uuid PRIMARY KEY, name text NOT NULL UNIQUE
);
CREATE TABLE releases (
  id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES products(id),
  identity text NOT NULL UNIQUE, provenance jsonb NOT NULL
);
CREATE TABLE fixtures (
  id uuid PRIMARY KEY, identity text NOT NULL UNIQUE, release_id uuid NOT NULL REFERENCES releases(id),
  framework text NOT NULL, configuration jsonb NOT NULL
);
CREATE TABLE scenarios (
  id uuid PRIMARY KEY, identity text NOT NULL UNIQUE, configuration jsonb NOT NULL
);
CREATE TABLE runs (
  id uuid PRIMARY KEY, ingestion_hash text NOT NULL CHECK (length(ingestion_hash) = 64),
  methodology_version text NOT NULL, collector_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('passed', 'failed', 'incomplete')),
  created_at timestamptz NOT NULL, manifest jsonb NOT NULL, envelope jsonb NOT NULL
);
CREATE INDEX runs_status_time ON runs(status, created_at DESC);
CREATE TABLE samples (
  id uuid PRIMARY KEY, run_id uuid NOT NULL REFERENCES runs(id),
  fixture_id uuid NOT NULL REFERENCES fixtures(id), scenario_id uuid NOT NULL REFERENCES scenarios(id),
  pair_id text, iteration integer NOT NULL CHECK (iteration >= 0), attempt integer NOT NULL CHECK (attempt >= 0),
  status text NOT NULL CHECK (status IN ('passed', 'failed', 'incomplete')),
  failures jsonb NOT NULL, diagnostics jsonb,
  UNIQUE(run_id, fixture_id, scenario_id, iteration, attempt)
);
CREATE INDEX samples_fixture_scenario ON samples(fixture_id, scenario_id);
CREATE TABLE measurements (
  sample_id uuid NOT NULL REFERENCES samples(id), metric text NOT NULL,
  unit text NOT NULL CHECK (unit IN ('ms', 'bytes', 'count', 'ratio', 'score')),
  status text NOT NULL CHECK (status IN ('measured', 'unavailable', 'unsupported', 'failed')),
  value double precision, integer_value bigint, reason text, method text NOT NULL,
  PRIMARY KEY(sample_id, metric),
  CHECK ((status = 'measured' AND reason IS NULL AND
          ((unit IN ('bytes', 'count') AND integer_value IS NOT NULL AND value IS NULL) OR
           (unit NOT IN ('bytes', 'count') AND value IS NOT NULL AND integer_value IS NULL))) OR
         (status <> 'measured' AND value IS NULL AND integer_value IS NULL AND reason IS NOT NULL AND length(reason) > 0)),
  CHECK (value IS NULL OR (value >= 0 AND value < 'Infinity'::double precision)),
  CHECK (integer_value IS NULL OR (integer_value >= 0 AND integer_value <= 9007199254740991)),
  CHECK (value IS NULL OR unit <> 'ratio' OR value <= 1)
);
CREATE INDEX measurements_metric ON measurements(metric, sample_id);
CREATE TABLE artifacts (
  id uuid PRIMARY KEY, run_id uuid NOT NULL REFERENCES runs(id), sample_id uuid REFERENCES samples(id),
  sha256 text NOT NULL CHECK (length(sha256) = 64), path text NOT NULL,
  media_type text NOT NULL, size_bytes bigint NOT NULL CHECK (size_bytes >= 0)
);
CREATE TABLE capability_checks (
  id uuid PRIMARY KEY, run_id uuid NOT NULL REFERENCES runs(id),
  fixture_id uuid NOT NULL REFERENCES fixtures(id), capability text NOT NULL,
  status text NOT NULL CHECK (status IN ('verified', 'failed', 'documented', 'unsupported', 'unknown')),
  framework text NOT NULL, mode text NOT NULL, evidence jsonb NOT NULL,
  verified_at timestamptz, reason text,
  CHECK (status <> 'verified' OR (verified_at IS NOT NULL AND jsonb_array_length(evidence) > 0))
);
CREATE INDEX capabilities_scope ON capability_checks(fixture_id, framework, mode, capability);
CREATE TABLE analyses (
  id uuid PRIMARY KEY, source_run_ids uuid[] NOT NULL, analysis_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), content_hash text NOT NULL UNIQUE, result jsonb NOT NULL
);
CREATE TABLE analysis_runs (
  analysis_id uuid NOT NULL REFERENCES analyses(id), run_id uuid NOT NULL REFERENCES runs(id),
  PRIMARY KEY(analysis_id, run_id)
);
CREATE TABLE legacy_imports (
  id uuid PRIMARY KEY, source_sha256 text NOT NULL UNIQUE CHECK (length(source_sha256) = 64),
  source_path text NOT NULL, imported_at timestamptz NOT NULL DEFAULT now(),
  methodology_version text NOT NULL CHECK (methodology_version = 'legacy'),
  collector_version text NOT NULL CHECK (collector_version = 'legacy-unknown'),
  original_text text NOT NULL, original_json jsonb NOT NULL,
  record_count integer NOT NULL CHECK (record_count >= 0), sample_count integer NOT NULL CHECK (sample_count >= 0),
  reconciliation jsonb NOT NULL,
  units text NOT NULL CHECK (units = 'unknown-ambiguous'), comparison_eligible boolean NOT NULL CHECK (comparison_eligible = false)
);
CREATE FUNCTION cookiebench_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'CookieBench records are immutable; insert a new revision instead';
END;
$$;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION cookiebench_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON releases FOR EACH ROW EXECUTE FUNCTION cookiebench_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON fixtures FOR EACH ROW EXECUTE FUNCTION cookiebench_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON scenarios FOR EACH ROW EXECUTE FUNCTION cookiebench_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON runs FOR EACH ROW EXECUTE FUNCTION cookiebench_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON samples FOR EACH ROW EXECUTE FUNCTION cookiebench_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON measurements FOR EACH ROW EXECUTE FUNCTION cookiebench_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON artifacts FOR EACH ROW EXECUTE FUNCTION cookiebench_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON capability_checks FOR EACH ROW EXECUTE FUNCTION cookiebench_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON analyses FOR EACH ROW EXECUTE FUNCTION cookiebench_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON analysis_runs FOR EACH ROW EXECUTE FUNCTION cookiebench_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON legacy_imports FOR EACH ROW EXECUTE FUNCTION cookiebench_immutable();
