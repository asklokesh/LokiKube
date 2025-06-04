import React from 'react';
import Layout from '@/components/Layout';
import ClusterConnection from '@/components/ClusterConnection';
import { NextPage } from 'next';

const ConnectPage: NextPage = () => {
  return (
    <Layout>
      <ClusterConnection />
    </Layout>
  );
};

export default ConnectPage; 